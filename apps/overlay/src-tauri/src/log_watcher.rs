use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

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
    LevelUp { character_name: String, level: u32 },
    #[serde(rename = "connected")]
    Connected { server: String },
    #[serde(rename = "area_level")]
    AreaLevel { level: u32 },
}

/// Initial state scanned from Client.txt history, stored in Tauri managed state
/// so the frontend can fetch it on mount (no race condition).
#[derive(serde::Serialize, Clone, Default)]
pub struct InitialGameState {
    pub character_name: Option<String>,
    pub zone: Option<String>,
    pub area_level: Option<u32>,
    pub game: Option<String>,
    pub log_path: Option<String>,
}

/// Wrapper for Tauri managed state
pub struct GameState(pub Mutex<InitialGameState>);

/// Tauri command: frontend calls this after mounting to get initial state
#[tauri::command]
pub fn get_initial_game_state(state: tauri::State<'_, GameState>) -> InitialGameState {
    state.0.lock().unwrap().clone()
}

/// Parse a single Client.txt log line into an event
fn parse_log_line(line: &str) -> Option<LogEvent> {
    // Check for DEBUG lines (area level detection)
    if line.contains("[DEBUG Client ") && line.contains("Generating level ") {
        if let Some(rest) = line.split("Generating level ").nth(1) {
            if let Some(level_str) = rest.split_whitespace().next() {
                if let Ok(level) = level_str.parse::<u32>() {
                    return Some(LogEvent::AreaLevel { level });
                }
            }
        }
    }

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

    // Level up: "{name} is now level {level}"
    if message.contains(" is now level ") {
        let parts: Vec<&str> = message.split(" is now level ").collect();
        if parts.len() == 2 {
            if let Ok(level) = parts[1].trim().parse::<u32>() {
                return Some(LogEvent::LevelUp {
                    character_name: parts[0].to_string(),
                    level,
                });
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

/// Scan the last 64KB of Client.txt for initial state
fn scan_log_history(log_path: &PathBuf) -> InitialGameState {
    let mut state = InitialGameState::default();

    // Detect game from path
    let path_str = log_path.to_string_lossy().to_string();
    state.game = Some(if path_str.contains("Path of Exile 2") {
        "poe2".to_string()
    } else {
        "poe1".to_string()
    });
    state.log_path = Some(path_str);

    if let Ok(mut file) = File::open(log_path) {
        let file_len = file.metadata().map(|m| m.len()).unwrap_or(0);
        let seek_pos = if file_len > 65536 { file_len - 65536 } else { 0 };
        let _ = file.seek(SeekFrom::Start(seek_pos));

        let reader = BufReader::new(file);
        for line in reader.lines().filter_map(|l| l.ok()) {
            if let Some(event) = parse_log_line(line.trim()) {
                match &event {
                    LogEvent::Death { character_name } => {
                        state.character_name = Some(character_name.clone());
                    }
                    LogEvent::LevelUp { character_name, .. } => {
                        state.character_name = Some(character_name.clone());
                    }
                    LogEvent::Zone { zone_name } => {
                        state.zone = Some(zone_name.clone());
                    }
                    LogEvent::AreaLevel { level } => {
                        state.area_level = Some(*level);
                    }
                    _ => {}
                }
            }
        }
    }

    println!(
        "Scanned log history: char={:?}, zone={:?}, area_level={:?}, game={:?}",
        state.character_name, state.zone, state.area_level, state.game
    );

    state
}

/// Start watching a Client.txt file for new log events.
/// Seeks to end of file on startup, only reads new lines.
pub fn start_log_watcher(app: AppHandle, log_path: PathBuf) {
    // Scan history and store in managed state BEFORE spawning the thread
    let initial = scan_log_history(&log_path);
    if let Some(game_state) = app.try_state::<GameState>() {
        *game_state.0.lock().unwrap() = initial;
    }

    std::thread::spawn(move || {
        // Open file and seek to end
        let mut file = match File::open(&log_path) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Failed to open log file {:?}: {}", log_path, e);
                let _ = app.emit("log-error", format!("Cannot open {:?}: {}", log_path, e));
                return;
            }
        };

        if let Err(e) = file.seek(SeekFrom::End(0)) {
            eprintln!("Failed to seek to end of log file: {}", e);
            return;
        }

        let mut reader = BufReader::new(file);

        println!("Watching log file (polling): {:?}", log_path);

        // Poll for new lines every 500ms — reliable on all drives
        loop {
            let mut line = String::new();
            while reader.read_line(&mut line).unwrap_or(0) > 0 {
                if let Some(log_event) = parse_log_line(line.trim()) {
                    // Update managed state
                    if let Some(game_state) = app.try_state::<GameState>() {
                        let mut gs = game_state.0.lock().unwrap();
                        match &log_event {
                            LogEvent::Death { character_name } => {
                                gs.character_name = Some(character_name.clone());
                            }
                            LogEvent::LevelUp { character_name, .. } => {
                                gs.character_name = Some(character_name.clone());
                            }
                            LogEvent::Zone { zone_name } => {
                                gs.zone = Some(zone_name.clone());
                            }
                            LogEvent::AreaLevel { level } => {
                                gs.area_level = Some(*level);
                            }
                            _ => {}
                        }
                    }

                    if let Err(e) = app.emit("log-event", &log_event) {
                        eprintln!("Failed to emit log event: {}", e);
                    }
                }
                line.clear();
            }

            thread::sleep(Duration::from_millis(500));
        }
    });
}
