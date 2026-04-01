import type { Game } from "../types/item.js";

export interface AtlasStrategy {
  id: string;
  name: string;
  game: Game;
  description: string;
  /** Expected chaos/hour estimate */
  expectedChaosPerHour: { min: number; max: number };
  /** Recommended maps to run */
  recommendedMaps: string[];
  /** Key atlas passives or mechanics to spec into */
  keyPassives: string[];
  /** What to focus on during maps */
  gamePlan: string[];
  /** Difficulty: how gear-dependent is this strategy */
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const ATLAS_STRATEGIES: AtlasStrategy[] = [
  // --- PoE1 Strategies ---
  {
    id: "poe1-essence",
    name: "Essence Farming",
    game: "poe1",
    description: "Spec into essence nodes on the atlas tree. Every map drops multiple essences which sell well in bulk.",
    expectedChaosPerHour: { min: 150, max: 400 },
    recommendedMaps: ["Strand", "Beach", "Tropical Island", "Atoll", "Mesa"],
    keyPassives: [
      "Crystal Resonance (essences always corrupted)",
      "Amplified Energies (extra essences)",
      "Essence-related atlas nodes",
    ],
    gamePlan: [
      "Run linear/open maps for speed",
      "Click every essence mob — don't skip",
      "Sell in bulk (10+ of same type) for premium",
      "Remnant of Corruption on high-tier essences",
    ],
    difficulty: "beginner",
  },
  {
    id: "poe1-expedition",
    name: "Expedition Farming",
    game: "poe1",
    description: "Spec into expedition encounters. Logbooks are extremely valuable and expedition currency sells well.",
    expectedChaosPerHour: { min: 200, max: 600 },
    recommendedMaps: ["Dunes", "City Square", "Shore", "Plateau"],
    keyPassives: [
      "All expedition atlas passives",
      "Expedition logbook chance nodes",
      "Increased expedition monsters",
    ],
    gamePlan: [
      "Always place explosives on remnants first",
      "Prioritize logbook-dropping remnants",
      "Run logbooks yourself or sell them",
      "Sell expedition currency in bulk",
    ],
    difficulty: "intermediate",
  },
  {
    id: "poe1-blight",
    name: "Blight Farming",
    game: "poe1",
    description: "Spec into blight encounters for blighted maps and oils. Blighted maps are very profitable.",
    expectedChaosPerHour: { min: 180, max: 500 },
    recommendedMaps: ["Strand", "Beach", "Canyon", "Atoll"],
    keyPassives: [
      "Blight atlas passives",
      "Blighted map drop nodes",
      "Blight encounter chance",
    ],
    gamePlan: [
      "Build blight towers efficiently",
      "Sell blighted maps or run them with scarabs",
      "Golden/silver oils are very valuable",
      "Anoint amulets to sell",
    ],
    difficulty: "intermediate",
  },
  {
    id: "poe1-legion",
    name: "Legion Farming",
    game: "poe1",
    description: "Spec into legion encounters. Good for builds with high AoE clear to break max generals.",
    expectedChaosPerHour: { min: 200, max: 450 },
    recommendedMaps: ["Dunes", "City Square", "Glacier", "Strand"],
    keyPassives: [
      "Legion atlas passives",
      "Monolith timer extension",
      "General spawn rate nodes",
    ],
    gamePlan: [
      "Need strong AoE to break all mobs in time",
      "Focus on breaking generals and sergeants first",
      "Emblems are very valuable — sell 4-way sets",
      "Incubators and splinters add up",
    ],
    difficulty: "intermediate",
  },
  {
    id: "poe1-harbinger",
    name: "Harbinger + Currency",
    game: "poe1",
    description: "Spec into harbinger and general currency nodes for steady income from raw currency drops.",
    expectedChaosPerHour: { min: 100, max: 300 },
    recommendedMaps: ["Any fast-clear map"],
    keyPassives: [
      "Harbinger atlas passives",
      "Currency drop nodes",
      "Increased rare monster packs",
    ],
    gamePlan: [
      "Run maps as fast as possible",
      "Quantity on gear helps significantly",
      "Convert harbinger currency shards",
      "Steady, reliable income",
    ],
    difficulty: "beginner",
  },

  // --- PoE2 Strategies ---
  {
    id: "poe2-breach",
    name: "Breach Farming",
    game: "poe2",
    description: "Focus on breach encounters in waystones. Splinters and breachstones are valuable in PoE2's economy.",
    expectedChaosPerHour: { min: 100, max: 350 },
    recommendedMaps: ["Meadow", "Dry Riverbed", "Burning Remnants"],
    keyPassives: [
      "Breach encounter nodes",
      "Increased breach monster density",
      "Breachstone upgrade chance",
    ],
    gamePlan: [
      "Stay inside breach circle to extend timer",
      "Kill breach bosses for extra splinters",
      "Combine splinters into breachstones",
      "Run breachstones for blessings",
    ],
    difficulty: "beginner",
  },
  {
    id: "poe2-ritual",
    name: "Ritual Farming",
    game: "poe2",
    description: "Spec into ritual altars for good drops and tribute rewards. Consistent and reliable income.",
    expectedChaosPerHour: { min: 120, max: 300 },
    recommendedMaps: ["Any waystone with good density"],
    keyPassives: [
      "Ritual atlas passives",
      "Increased tribute",
      "Ritual reroll chance",
    ],
    gamePlan: [
      "Complete all ritual altars in each map",
      "Defer expensive items and buy later",
      "Ritual vessels can store encounters",
      "Look for uniques and valuable currency in tribute shop",
    ],
    difficulty: "beginner",
  },
  {
    id: "poe2-delirium",
    name: "Delirium Pushing",
    game: "poe2",
    description: "Push delirium fog as deep as possible for simulacrum splinters and cluster jewels.",
    expectedChaosPerHour: { min: 200, max: 600 },
    recommendedMaps: ["Linear layouts — Torchlit Mines, Blood Aqueduct"],
    keyPassives: [
      "Delirium atlas passives",
      "Fog duration nodes",
      "Delirium reward type nodes",
    ],
    gamePlan: [
      "Need fast build — fog timer is punishing",
      "Linear maps let you push deeper",
      "Simulacrum splinters are very valuable",
      "Higher delirium tiers = better rewards",
    ],
    difficulty: "advanced",
  },
];

/** Get strategies for a specific game */
export function getStrategies(game: Game): AtlasStrategy[] {
  return ATLAS_STRATEGIES.filter((s) => s.game === game);
}

/** Get a strategy by ID */
export function getStrategy(id: string): AtlasStrategy | null {
  return ATLAS_STRATEGIES.find((s) => s.id === id) ?? null;
}
