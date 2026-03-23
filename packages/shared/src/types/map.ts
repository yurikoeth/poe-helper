import type { Game } from "./item.js";

/** Danger level for a map mod */
export type DangerLevel = "deadly" | "dangerous" | "caution" | "safe";

/** A dangerous map mod entry */
export interface DangerousMod {
  /** Regex pattern to match the mod text */
  pattern: RegExp;
  /** Short display name */
  shortName: string;
  /** Danger level */
  danger: DangerLevel;
  /** Human-readable explanation of why this is dangerous */
  description: string;
  /** Build archetypes this is especially dangerous for */
  dangerousFor: string[];
  /** Build archetypes that can ignore this mod */
  safeFor: string[];
  /** Which games this mod appears in */
  games: Game[];
}

/** Result of analyzing map mods */
export interface MapModAnalysis {
  /** The raw map mod text */
  modText: string;
  /** Matched dangerous mod entry, if any */
  match: DangerousMod | null;
  /** Overall danger level for this mod */
  danger: DangerLevel;
}

/** Full map analysis result */
export interface MapAnalysis {
  /** Map name/base */
  mapName: string;
  /** Map tier */
  tier: number | null;
  /** Analysis of each mod */
  mods: MapModAnalysis[];
  /** Overall danger rating (worst mod) */
  overallDanger: DangerLevel;
  /** Number of deadly/dangerous mods */
  dangerCount: number;
}
