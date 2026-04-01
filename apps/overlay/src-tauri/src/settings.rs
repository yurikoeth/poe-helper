use tauri_plugin_sql::{Migration, MigrationKind};

/// Database URL for SQLite (stored in app data dir)
pub const DB_URL: &str = "sqlite:exiled-orb.db";

/// SQL migrations run automatically on plugin init
pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create settings table",
            sql: "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL DEFAULT (unixepoch())
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create map_runs table",
            sql: "CREATE TABLE IF NOT EXISTS map_runs (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                map_name TEXT NOT NULL,
                map_tier INTEGER,
                game TEXT NOT NULL,
                league TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                completed_at INTEGER,
                total_ms INTEGER,
                deaths INTEGER NOT NULL DEFAULT 0,
                completed INTEGER NOT NULL DEFAULT 0,
                data TEXT,
                created_at INTEGER NOT NULL DEFAULT (unixepoch())
            );
            CREATE INDEX IF NOT EXISTS idx_map_runs_session ON map_runs(session_id);
            CREATE INDEX IF NOT EXISTS idx_map_runs_started ON map_runs(started_at);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create map_notes table",
            sql: "CREATE TABLE IF NOT EXISTS map_notes (
                map_name TEXT NOT NULL,
                game TEXT NOT NULL,
                layout_rating INTEGER,
                boss_rating INTEGER,
                notes TEXT,
                layout_hints TEXT,
                updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
                PRIMARY KEY (map_name, game)
            );",
            kind: MigrationKind::Up,
        },
    ]
}
