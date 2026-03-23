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
