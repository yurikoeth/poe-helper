import type { LogEvent, Game } from "../types/index.js";

/**
 * Parse a single line from Client.txt into a structured event.
 * Returns null if the line isn't a recognized event.
 *
 * Client.txt log format examples:
 *   2024/03/15 14:23:45 12345678 abc [INFO Client 1234] : You have entered Lioneye's Watch.
 *   2024/03/15 14:23:45 12345678 abc [INFO Client 1234] : PlayerName has been slain.
 *   2024/03/15 14:23:45 12345678 abc [INFO Client 1234] : @From PlayerName: Hi, I'd like to buy...
 *   2024/03/15 14:23:45 12345678 abc [INFO Client 1234] : @To PlayerName: Sure, invite sent
 *   2024/03/15 14:23:45 12345678 abc [INFO Client 1234] : PlayerName is now level 85
 *   2024/03/15 14:23:45 12345678 abc [INFO Client 1234] : Connecting to instance server at 1.2.3.4:6112
 */

const TIMESTAMP_REGEX = /^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/;
const INFO_CLIENT_REGEX = /\[INFO Client \d+\]\s*:\s*(.*)/;

/** Parse a timestamp from log format "2024/03/15 14:23:45" */
function parseTimestamp(str: string): number {
  return new Date(str.replace(/\//g, "-")).getTime();
}

/** Parse a single Client.txt log line */
export function parseLogLine(line: string, _game: Game = "poe1"): LogEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Extract timestamp
  const tsMatch = trimmed.match(TIMESTAMP_REGEX);
  if (!tsMatch) return null;

  const timestamp = parseTimestamp(tsMatch[1]);

  // Extract the message content after [INFO Client XXXX] :
  const infoMatch = trimmed.match(INFO_CLIENT_REGEX);
  if (!infoMatch) return null;

  const message = infoMatch[1].trim();

  // Zone change: "You have entered {zone}."
  const zoneMatch = message.match(/^You have entered (.+)\.$/);
  if (zoneMatch) {
    return {
      type: "zone",
      data: {
        timestamp,
        zoneName: zoneMatch[1],
        areaLevel: null, // Area level not in log, would need game data lookup
        game: _game,
      },
    };
  }

  // Death: "{name} has been slain."
  const deathMatch = message.match(/^(.+) has been slain\.$/);
  if (deathMatch) {
    return {
      type: "death",
      data: {
        timestamp,
        characterName: deathMatch[1],
        game: _game,
      },
    };
  }

  // Incoming whisper: "@From {name}: {message}"
  const whisperInMatch = message.match(/^@From (.+?):\s*(.*)$/);
  if (whisperInMatch) {
    return {
      type: "whisper",
      data: {
        timestamp,
        direction: "incoming",
        playerName: whisperInMatch[1],
        message: whisperInMatch[2],
      },
    };
  }

  // Outgoing whisper: "@To {name}: {message}"
  const whisperOutMatch = message.match(/^@To (.+?):\s*(.*)$/);
  if (whisperOutMatch) {
    return {
      type: "whisper",
      data: {
        timestamp,
        direction: "outgoing",
        playerName: whisperOutMatch[1],
        message: whisperOutMatch[2],
      },
    };
  }

  // Level up: "{name} is now level {level}"
  const levelMatch = message.match(/is now level (\d+)/);
  if (levelMatch) {
    return {
      type: "level_up",
      data: {
        timestamp,
        level: parseInt(levelMatch[1], 10),
      },
    };
  }

  // Connection: "Connecting to instance server at {ip}:{port}"
  const connectMatch = message.match(/^Connecting to instance server at (.+)$/);
  if (connectMatch) {
    return {
      type: "connected",
      data: {
        timestamp,
        server: connectMatch[1],
      },
    };
  }

  return null;
}

/** Parse multiple log lines, filtering out non-events */
export function parseLogLines(lines: string[], game: Game = "poe1"): LogEvent[] {
  return lines
    .map((line) => parseLogLine(line, game))
    .filter((event): event is LogEvent => event !== null);
}
