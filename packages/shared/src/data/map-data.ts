import type { Game } from "../types/item.js";

export interface MapInfo {
  name: string;
  tier: number | null;
  game: Game;
  /** Known boss arena zone names (for detecting boss phase) */
  bossArenas: string[];
  /** Layout tags for quick reference */
  tags: string[];
}

/**
 * Known map/waystone zone names. Used to detect when a player enters a map
 * (as opposed to a town, hideout, or campaign zone).
 *
 * This is a curated list of the most popular/common maps. Not exhaustive.
 */
export const MAP_DATABASE: MapInfo[] = [
  // --- PoE1 Maps (Atlas of Worlds) ---
  { name: "Strand", tier: 1, game: "poe1", bossArenas: [], tags: ["linear", "open"] },
  { name: "Beach", tier: 1, game: "poe1", bossArenas: [], tags: ["linear", "open"] },
  { name: "Glacier", tier: 2, game: "poe1", bossArenas: [], tags: ["open"] },
  { name: "Alleyways", tier: 2, game: "poe1", bossArenas: [], tags: ["linear"] },
  { name: "Burial Chambers", tier: 4, game: "poe1", bossArenas: [], tags: ["indoor", "narrow"] },
  { name: "Tower", tier: 5, game: "poe1", bossArenas: ["Tower Rooftop"], tags: ["indoor", "vertical"] },
  { name: "Jungle Valley", tier: 3, game: "poe1", bossArenas: [], tags: ["open", "outdoor"] },
  { name: "Crimson Temple", tier: 14, game: "poe1", bossArenas: [], tags: ["indoor", "open-rooms"] },
  { name: "Dunes", tier: 5, game: "poe1", bossArenas: [], tags: ["open", "outdoor"] },
  { name: "Canyon", tier: 7, game: "poe1", bossArenas: [], tags: ["semi-linear", "outdoor"] },
  { name: "City Square", tier: 6, game: "poe1", bossArenas: [], tags: ["open", "outdoor"] },
  { name: "Underground Sea", tier: 8, game: "poe1", bossArenas: [], tags: ["indoor", "maze"] },
  { name: "Toxic Sewer", tier: 7, game: "poe1", bossArenas: [], tags: ["linear", "indoor"] },
  { name: "Precinct", tier: 12, game: "poe1", bossArenas: [], tags: ["open", "multi-boss"] },
  { name: "Bog", tier: 6, game: "poe1", bossArenas: [], tags: ["open", "outdoor"] },
  { name: "Mesa", tier: 3, game: "poe1", bossArenas: [], tags: ["open", "outdoor"] },
  { name: "Atoll", tier: 9, game: "poe1", bossArenas: [], tags: ["circular", "outdoor"] },
  { name: "Cemetery", tier: 5, game: "poe1", bossArenas: [], tags: ["open", "outdoor"] },
  { name: "Shore", tier: 10, game: "poe1", bossArenas: [], tags: ["linear", "outdoor"] },
  { name: "Promenade", tier: 11, game: "poe1", bossArenas: [], tags: ["linear"] },
  { name: "Colonnade", tier: 10, game: "poe1", bossArenas: [], tags: ["linear", "open"] },
  { name: "Plateau", tier: 12, game: "poe1", bossArenas: [], tags: ["open", "outdoor"] },
  { name: "Tropical Island", tier: 4, game: "poe1", bossArenas: [], tags: ["linear", "outdoor"] },
  { name: "Volcano", tier: 8, game: "poe1", bossArenas: [], tags: ["semi-linear"] },
  { name: "Lair", tier: 11, game: "poe1", bossArenas: [], tags: ["semi-linear", "indoor"] },
  { name: "Underground River", tier: 8, game: "poe1", bossArenas: [], tags: ["linear", "indoor"] },

  // PoE1 Pinnacle Boss Zones
  { name: "Absence of Value and Meaning", tier: null, game: "poe1", bossArenas: [], tags: ["boss", "sirus"] },
  { name: "The Maven's Crucible", tier: null, game: "poe1", bossArenas: [], tags: ["boss", "maven"] },
  { name: "The Shaper's Realm", tier: null, game: "poe1", bossArenas: [], tags: ["boss", "shaper"] },
  { name: "The Elder's Domain", tier: null, game: "poe1", bossArenas: [], tags: ["boss", "elder"] },
  { name: "Eye of the Storm", tier: null, game: "poe1", bossArenas: [], tags: ["boss", "uber-elder"] },

  // --- PoE2 Waystones ---
  { name: "Meadow", tier: 1, game: "poe2", bossArenas: [], tags: ["open", "outdoor"] },
  { name: "Torchlit Mines", tier: 1, game: "poe2", bossArenas: [], tags: ["indoor", "linear"] },
  { name: "Infested Ruins", tier: 2, game: "poe2", bossArenas: [], tags: ["indoor"] },
  { name: "Sandworm Tunnels", tier: 2, game: "poe2", bossArenas: [], tags: ["indoor", "narrow"] },
  { name: "Flooded Cavern", tier: 3, game: "poe2", bossArenas: [], tags: ["indoor"] },
  { name: "Dry Riverbed", tier: 3, game: "poe2", bossArenas: [], tags: ["outdoor", "open"] },
  { name: "Crimson Village", tier: 4, game: "poe2", bossArenas: [], tags: ["outdoor"] },
  { name: "Sinking Spire", tier: 5, game: "poe2", bossArenas: [], tags: ["indoor", "vertical"] },
  { name: "Salt Mines", tier: 5, game: "poe2", bossArenas: [], tags: ["indoor"] },
  { name: "Burning Remnants", tier: 6, game: "poe2", bossArenas: [], tags: ["outdoor", "open"] },
  { name: "Blighted Bog", tier: 7, game: "poe2", bossArenas: [], tags: ["outdoor"] },
  { name: "Forgotten Citadel", tier: 8, game: "poe2", bossArenas: [], tags: ["indoor", "large"] },
  { name: "Mouldering Arena", tier: 9, game: "poe2", bossArenas: [], tags: ["indoor", "open"] },
  { name: "Sunken Ziggurat", tier: 10, game: "poe2", bossArenas: [], tags: ["indoor"] },
  { name: "Spore Grotto", tier: 11, game: "poe2", bossArenas: [], tags: ["indoor"] },
  { name: "Blood Aqueduct", tier: 7, game: "poe2", bossArenas: [], tags: ["linear", "outdoor"] },
];

/**
 * Lookup a map by zone name. Matches if the zone name contains the map name
 * (e.g., "Strand Map" matches "Strand", "Tier 5 Strand" matches "Strand").
 */
export function findMap(zoneName: string, game?: Game): MapInfo | null {
  const lower = zoneName.toLowerCase();
  for (const map of MAP_DATABASE) {
    if (game && map.game !== game) continue;
    if (lower.includes(map.name.toLowerCase())) return map;
  }
  return null;
}

/**
 * Check if a zone name corresponds to a map zone (not a town, hideout, or campaign area).
 * Uses the map database + pattern matching for PoE1 "X Map" and PoE2 waystones.
 */
export function isMapZone(zoneName: string, game?: Game): boolean {
  if (findMap(zoneName, game)) return true;
  // PoE1: many map zones end with "Map" or contain "Map" in the zone name
  if (zoneName.toLowerCase().includes(" map")) return true;
  // PoE2: waystone zones don't have a consistent suffix, rely on database
  return false;
}

/** Check if a zone name is a known boss arena */
export function isBossArena(zoneName: string, game?: Game): boolean {
  for (const map of MAP_DATABASE) {
    if (game && map.game !== game) continue;
    for (const arena of map.bossArenas) {
      if (zoneName.toLowerCase().includes(arena.toLowerCase())) return true;
    }
  }
  return false;
}
