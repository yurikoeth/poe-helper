mod ai;
mod clipboard;
mod log_watcher;
mod oauth;
mod settings;

use std::path::PathBuf;
use tauri::Manager;
use tauri::tray::TrayIconBuilder;
use tauri::menu::{MenuBuilder, MenuItemBuilder};

/// Tauri command: show the settings window
#[tauri::command]
fn show_settings(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Tauri command: set the Client.txt log path and start watching it
#[tauri::command]
fn set_log_path(app: tauri::AppHandle, path: String) {
    let log_path = PathBuf::from(path);
    if log_path.exists() {
        log_watcher::start_log_watcher(app, log_path);
    } else {
        eprintln!("Log file does not exist: {:?}", log_path);
    }
}

/// Tauri command: get default log file paths to check
#[tauri::command]
fn get_default_log_paths() -> Vec<String> {
    vec![
        // PoE1 paths
        r"C:\Program Files (x86)\Grinding Gear Games\Path of Exile\logs\Client.txt".into(),
        r"C:\Program Files (x86)\Steam\steamapps\common\Path of Exile\logs\Client.txt".into(),
        r"C:\Program Files\Grinding Gear Games\Path of Exile\logs\Client.txt".into(),
        // PoE1 — custom Steam library locations
        r"D:\SteamLibrary\steamapps\common\Path of Exile\logs\Client.txt".into(),
        r"E:\SteamLibrary\steamapps\common\Path of Exile\logs\Client.txt".into(),
        r"F:\SteamLibrary\steamapps\common\Path of Exile\logs\Client.txt".into(),
        // PoE2 paths
        r"C:\Program Files (x86)\Grinding Gear Games\Path of Exile 2\logs\Client.txt".into(),
        r"C:\Program Files (x86)\Steam\steamapps\common\Path of Exile 2\logs\Client.txt".into(),
        r"C:\Program Files\Grinding Gear Games\Path of Exile 2\logs\Client.txt".into(),
        // PoE2 — custom Steam library locations
        r"D:\SteamLibrary\steamapps\common\Path of Exile 2\logs\Client.txt".into(),
        r"E:\SteamLibrary\steamapps\common\Path of Exile 2\logs\Client.txt".into(),
        r"F:\SteamLibrary\steamapps\common\Path of Exile 2\logs\Client.txt".into(),
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(settings::DB_URL, settings::migrations())
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(log_watcher::GameState(std::sync::Mutex::new(
            log_watcher::InitialGameState::default(),
        )))
        .invoke_handler(tauri::generate_handler![
            set_log_path,
            get_default_log_paths,
            show_settings,
            log_watcher::get_initial_game_state,
            ai::ask_poe_question,
            ai::ask_poe_with_image,
            ai::analyze_item_price,
            ai::analyze_trade_whisper,
            ai::analyze_market_trends,
            ai::analyze_build,
            oauth::fetch_characters,
            oauth::fetch_ninja,
            oauth::fetch_character_items,
        ])
        .setup(|app| {
            // Build system tray
            let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
            let settings = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&show, &settings, &quit]).build()?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("app icon must be set in tauri.conf.json").clone())
                .tooltip("ExiledOrb")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("overlay") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "settings" => {
                            if let Some(window) = app.get_webview_window("settings") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Start clipboard watcher on launch
            let handle = app.handle().clone();
            clipboard::start_clipboard_watcher(handle);

            // Try to auto-detect and watch Client.txt
            let handle = app.handle().clone();
            let paths = get_default_log_paths();
            for path_str in &paths {
                let path = PathBuf::from(path_str);
                if path.exists() {
                    println!("Auto-detected log file: {}", path_str);
                    log_watcher::start_log_watcher(handle.clone(), path);
                    break;
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
