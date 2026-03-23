use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

/// Represents a parsed log event sent to the frontend
#[derive(serde::Serialize, Clone)]
#[serde(tag = "type")]
pub enum LogEvent {
    #[serde(rename = "zone")]
    Zone { zone_name: String },
    #[serde(rename = "death")]
    Death { character_name: String },
    #[serde(rename = "whisper")]
    Whisper {
        direction: String,
        player_name: String,
        message: String,
    },
    #[serde(rename = "level_up")]
    LevelUp { level: u32 },
    #[serde(rename = "connected")]
    Connected { server: String },
}

/// Parse a single Client.txt log line into an event
fn parse_log_line(line: &str) -> Option<LogEvent> {
    // Extract message after [INFO Client XXXX] :
    let marker = "[INFO Client ";
    let marker_pos = line.find(marker)?;
    let after_marker = &line[marker_pos..];
    let colon_pos = after_marker.find("] : ")?;
    let message = after_marker[colon_pos + 4..].trim();

    // Zone change: "You have entered {zone}."
    if let Some(zone) = message
        .strip_prefix("You have entered ")
        .and_then(|s| s.strip_suffix('.'))
    {
        return Some(LogEvent::Zone {
            zone_name: zone.to_string(),
        });
    }

    // Death: "{name} has been slain."
    if let Some(name) = message.strip_suffix(" has been slain.") {
        return Some(LogEvent::Death {
            character_name: name.to_string(),
        });
    }

    // Incoming whisper: "@From {name}: {message}"
    if let Some(rest) = message.strip_prefix("@From ") {
        if let Some(colon_idx) = rest.find(": ") {
            return Some(LogEvent::Whisper {
                direction: "incoming".to_string(),
                player_name: rest[..colon_idx].to_string(),
                message: rest[colon_idx + 2..].to_string(),
            });
        }
    }

    // Outgoing whisper: "@To {name}: {message}"
    if let Some(rest) = message.strip_prefix("@To ") {
        if let Some(colon_idx) = rest.find(": ") {
            return Some(LogEvent::Whisper {
                direction: "outgoing".to_string(),
                player_name: rest[..colon_idx].to_string(),
                message: rest[colon_idx + 2..].to_string(),
            });
        }
    }

    // Level up: "is now level {level}"
    if message.contains("is now level ") {
        if let Some(level_str) = message.split("is now level ").nth(1) {
            if let Ok(level) = level_str.trim().parse::<u32>() {
                return Some(LogEvent::LevelUp { level });
            }
        }
    }

    // Connection: "Connecting to instance server at {addr}"
    if let Some(server) = message.strip_prefix("Connecting to instance server at ") {
        return Some(LogEvent::Connected {
            server: server.to_string(),
        });
    }

    None
}

/// Start watching a Client.txt file for new log events.
/// Seeks to end of file on startup, only reads new lines.
pub fn start_log_watcher(app: AppHandle, log_path: PathBuf) {
    std::thread::spawn(move || {
        // Open file and seek to end
        let mut file = match File::open(&log_path) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Failed to open log file {:?}: {}", log_path, e);
                // Emit an error so the frontend knows
                let _ = app.emit("log-error", format!("Cannot open {:?}: {}", log_path, e));
                return;
            }
        };

        // Seek to end — we only care about new events
        if let Err(e) = file.seek(SeekFrom::End(0)) {
            eprintln!("Failed to seek to end of log file: {}", e);
            return;
        }

        let mut reader = BufReader::new(file);

        // Set up file watcher
        let (tx, rx) = mpsc::channel();
        let mut watcher = match RecommendedWatcher::new(tx, Config::default()) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Failed to create file watcher: {}", e);
                return;
            }
        };

        if let Err(e) = watcher.watch(&log_path, RecursiveMode::NonRecursive) {
            eprintln!("Failed to watch log file: {}", e);
            return;
        }

        println!("Watching log file: {:?}", log_path);

        // Process file change events
        for event in rx {
            match event {
                Ok(event) => {
                    if matches!(event.kind, EventKind::Modify(_)) {
                        // Read new lines
                        let mut line = String::new();
                        while reader.read_line(&mut line).unwrap_or(0) > 0 {
                            if let Some(log_event) = parse_log_line(line.trim()) {
                                if let Err(e) = app.emit("log-event", &log_event) {
                                    eprintln!("Failed to emit log event: {}", e);
                                }
                            }
                            line.clear();
                        }
                    }
                }
                Err(e) => {
                    eprintln!("File watcher error: {}", e);
                }
            }
        }
    });
}
