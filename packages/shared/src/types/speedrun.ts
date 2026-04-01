import type { Game } from "./item.js";

export interface MapRun {
  id: string;
  sessionId: string;
  mapName: string;
  mapTier: number | null;
  game: Game;
  league: string;

  startedAt: number;
  bossEnteredAt: number | null;
  completedAt: number | null;
  totalMs: number | null;

  deaths: number;
  completed: boolean;

  /** JSON-serialized extra data (splits, loot estimates, etc.) */
  data: string | null;
}

export interface SpeedrunSession {
  id: string;
  game: Game;
  league: string;
  startedAt: number;
  endedAt: number | null;

  maps: MapRun[];
  totalMaps: number;
  completedMaps: number;
  totalDeaths: number;
  totalTimeMs: number;

  mapsPerHour: number | null;
  avgMapTimeMs: number | null;
  chaosPerHour: number | null;

  fastestMapMs: number | null;
  slowestMapMs: number | null;
  fastestMapName: string | null;
}

export interface MapNote {
  mapName: string;
  game: Game;
  layoutRating: 1 | 2 | 3 | 4 | 5;
  bossRating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  layoutHints: string[];
  updatedAt: number;
}

/** Compute aggregate stats from a list of completed map runs */
export function computeSessionStats(
  maps: MapRun[],
  sessionStartedAt: number
): Pick<SpeedrunSession, "totalMaps" | "completedMaps" | "totalDeaths" | "totalTimeMs" | "mapsPerHour" | "avgMapTimeMs" | "fastestMapMs" | "slowestMapMs" | "fastestMapName"> {
  const completed = maps.filter((m) => m.completed && m.totalMs != null);
  const totalTimeMs = Date.now() - sessionStartedAt;
  const totalHours = totalTimeMs / 3_600_000;

  const times = completed.map((m) => m.totalMs!);
  const fastest = times.length > 0 ? Math.min(...times) : null;
  const slowest = times.length > 0 ? Math.max(...times) : null;
  const fastestRun = fastest != null ? completed.find((m) => m.totalMs === fastest) : null;

  return {
    totalMaps: maps.length,
    completedMaps: completed.length,
    totalDeaths: maps.reduce((sum, m) => sum + m.deaths, 0),
    totalTimeMs,
    mapsPerHour: totalHours > 0 ? completed.length / totalHours : null,
    avgMapTimeMs: completed.length > 0 ? times.reduce((a, b) => a + b, 0) / completed.length : null,
    fastestMapMs: fastest,
    slowestMapMs: slowest,
    fastestMapName: fastestRun?.mapName ?? null,
  };
}
