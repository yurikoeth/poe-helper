use arboard::Clipboard;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Checks if clipboard text looks like a PoE item
fn is_poe_item(text: &str) -> bool {
    text.contains("Item Class:") || (text.contains("Rarity:") && text.contains("--------"))
}

/// Continuously polls the clipboard for PoE item text.
/// When a new item is detected, emits a "clipboard-item" event to the frontend.
pub fn start_clipboard_watcher(app: AppHandle) {
    let last_content: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));

    std::thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Failed to access clipboard: {}", e);
                return;
            }
        };

        loop {
            std::thread::sleep(Duration::from_millis(200));

            let text = match clipboard.get_text() {
                Ok(t) => t,
                Err(_) => continue,
            };

            // Check if content changed and looks like a PoE item
            let mut last = last_content.lock().unwrap();
            if text != *last && is_poe_item(&text) {
                *last = text.clone();
                drop(last); // Release lock before emitting

                if let Err(e) = app.emit("clipboard-item", text) {
                    eprintln!("Failed to emit clipboard event: {}", e);
                }
            }
        }
    });
}
