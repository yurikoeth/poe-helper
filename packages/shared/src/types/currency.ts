import type { Game } from "./item.js";

/** Currency rate from poe.ninja */
export interface CurrencyRate {
  name: string;
  chaosEquivalent: number;
  icon: string;
  game: Game;
  league: string;
  updatedAt: number;
}

/** Price data categories from poe.ninja */
export type PoeNinjaCategory =
  | "Currency"
  | "Fragment"
  | "DivinationCard"
  | "Artifact"
  | "Oil"
  | "Incubator"
  | "UniqueWeapon"
  | "UniqueArmour"
  | "UniqueAccessory"
  | "UniqueFlask"
  | "UniqueJewel"
  | "UniqueMap"
  | "SkillGem"
  | "BaseType"
  | "Map"
  | "Essence"
  | "Fossil"
  | "Resonator"
  | "Scarab"
  | "Tattoo"
  | "Omen";

/** A cached price entry */
export interface PriceCache {
  category: PoeNinjaCategory;
  league: string;
  game: Game;
  data: PoeNinjaItem[];
  fetchedAt: number;
  /** Cache TTL in milliseconds (default 5 minutes) */
  ttl: number;
}

/** Generic poe.ninja item price entry */
export interface PoeNinjaItem {
  name: string;
  baseType?: string;
  chaosValue: number;
  divineValue: number;
  icon: string;
  links?: number;
  gemLevel?: number;
  gemQuality?: number;
  variant?: string;
  listingCount: number;
}
