/**
 * Known hideout zone names for detecting map completion (return to hideout).
 * When a player zones into one of these, an active map run is considered completed.
 *
 * Includes default hideouts, MTX hideouts, and guild hideouts for both PoE1 and PoE2.
 */
export const HIDEOUT_NAMES: Set<string> = new Set([
  // Default / Common
  "Hideout",
  "The Twilight Strand",

  // PoE1 Hideout Tilesets
  "Coastal Hideout",
  "Backstreet Hideout",
  "Immaculate Hideout",
  "Alpine Hideout",
  "Baleful Hideout",
  "Brutal Hideout",
  "Celestial Hideout",
  "Desert Hideout",
  "Enlightened Hideout",
  "Glacial Hideout",
  "Lush Hideout",
  "Luxurious Hideout",
  "Overgrown Hideout",
  "Stately Hideout",
  "Undercity Hideout",
  "Unearthed Hideout",
  "Coral Hideout",
  "Battle-scarred Hideout",
  "Divided Hideout",
  "Robber's Trench Hideout",
  "Sunken Hideout",
  "Sanguine Hideout",
  "Walled-off Hideout",

  // PoE2 Hideouts
  "Smuggler's Den",
  "The Clearings",
  "Ziggurat Encampment",
  "Karui Hideout",

  // Guild hideout
  "Guild Hideout",
]);

/** Check if a zone name is a hideout */
export function isHideout(zoneName: string): boolean {
  // Direct match
  if (HIDEOUT_NAMES.has(zoneName)) return true;
  // Fuzzy match: any zone containing "Hideout" or "hideout"
  if (zoneName.toLowerCase().includes("hideout")) return true;
  return false;
}
