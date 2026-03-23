mod clipboard;
mod log_watcher;

use std::path::PathBuf;
use tauri::Manager;

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
        // PoE2 paths
        r"C:\Program Files (x86)\Grinding Gear Games\Path of Exile 2\logs\Client.txt".into(),
        r"C:\Program Files (x86)\Steam\steamapps\common\Path of Exile 2\logs\Client.txt".into(),
        r"C:\Program Files\Grinding Gear Games\Path of Exile 2\logs\Client.txt".into(),
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![set_log_path, get_default_log_paths])
        .setup(|app| {
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
