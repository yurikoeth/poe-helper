import type { Game } from "./item.js";

/** A zone change event from Client.txt */
export interface ZoneEvent {
  timestamp: number;
  zoneName: string;
  areaLevel: number | null;
  game: Game;
}

/** A death event from Client.txt */
export interface DeathEvent {
  timestamp: number;
  characterName: string;
  game: Game;
}

/** A whisper/trade message from Client.txt */
export interface WhisperEvent {
  timestamp: number;
  direction: "incoming" | "outgoing";
  playerName: string;
  message: string;
}

/** Client.txt log event union */
export type LogEvent =
  | { type: "zone"; data: ZoneEvent }
  | { type: "death"; data: DeathEvent }
  | { type: "whisper"; data: WhisperEvent }
  | { type: "level_up"; data: { timestamp: number; level: number } }
  | { type: "connected"; data: { timestamp: number; server: string } };

/**
 * Raw "log-event" payload emitted by the Rust log_watcher.
 * Serde tags the event variant with the `type` field (see log_watcher.rs).
 * Fields are snake_case since Rust serializes that way.
 */
export interface LogEventPayload {
  type: string;
  zone_name?: string;
  character_name?: string;
  direction?: string;
  player_name?: string;
  message?: string;
  level?: number;
  server?: string;
  game?: string;
  log_path?: string;
}

/** Initial game state returned by the Rust `get_initial_game_state` IPC command. */
export interface InitialGameState {
  character_name: string | null;
  zone: string | null;
  area_level: number | null;
  game: string | null;
  log_path: string | null;
}

/** An active play session */
export interface Session {
  id: string;
  game: Game;
  league: string;
  startedAt: number;
  endedAt: number | null;
  zonesVisited: number;
  deaths: number;
  currentZone: string | null;
  events: LogEvent[];
}
