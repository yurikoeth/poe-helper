import type { ParsedItem, PriceResult, PoeNinjaCategory } from "@poe-helper/shared";
import { lookupPrice, getDivineRate, searchTrade } from "@poe-helper/shared";

/** Map item class/rarity to poe.ninja category */
function getCategory(item: ParsedItem): PoeNinjaCategory | null {
  if (item.rarity === "Currency") return "Currency";
  if (item.rarity === "Divination Card") return "DivinationCard";
  if (item.rarity === "Gem") return "SkillGem";

  if (item.rarity === "Unique") {
    const cls = item.itemClass.toLowerCase();
    if (cls.includes("weapon") || cls.includes("bow") || cls.includes("wand") || cls.includes("staff") || cls.includes("dagger") || cls.includes("sceptre") || cls.includes("mace") || cls.includes("axe") || cls.includes("sword") || cls.includes("claw")) return "UniqueWeapon";
    if (cls.includes("armour") || cls.includes("helmet") || cls.includes("glove") || cls.includes("boot") || cls.includes("body") || cls.includes("shield")) return "UniqueArmour";
    if (cls.includes("ring") || cls.includes("amulet") || cls.includes("belt")) return "UniqueAccessory";
    if (cls.includes("flask")) return "UniqueFlask";
    if (cls.includes("jewel")) return "UniqueJewel";
    if (cls.includes("map") || cls.includes("waystone")) return "UniqueMap";
    return "UniqueArmour"; // fallback
  }

  if (item.itemClass.toLowerCase().includes("map")) return "Map";

  // Fragment items
  const fragmentKeywords = ["fragment", "splinter", "emblem", "scarab", "offering"];
  if (fragmentKeywords.some((kw) => item.baseType.toLowerCase().includes(kw))) return "Fragment";

  return null;
}

/** Default league — should come from settings/API in production */
const DEFAULT_LEAGUE = "Settlers of Kalguur"; // Update per league

/**
 * Check the price of a parsed item.
 * Routes to poe.ninja for known categories, falls back to trade API for rares.
 */
export async function checkPrice(
  item: ParsedItem,
  league: string = DEFAULT_LEAGUE
): Promise<PriceResult> {
  const category = getCategory(item);

  // For items with a poe.ninja category, use direct lookup
  if (category) {
    try {
      const lookupName = item.name || item.baseType;
      const ninjaItem = await lookupPrice(item.game, league, category, lookupName, {
        links: item.links && item.links >= 5 ? item.links : undefined,
        gemLevel: item.gemLevel ?? undefined,
      });

      if (ninjaItem) {
        const divineRate = await getDivineRate(item.game, league);
        return {
          item,
          source: "poe.ninja",
          chaosValue: ninjaItem.chaosValue,
          divineValue: divineRate > 0 ? ninjaItem.chaosValue / divineRate : ninjaItem.divineValue,
          confidence: "exact",
          listingCount: ninjaItem.listingCount,
          priceRange: null,
          tradeUrl: null,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      console.error("poe.ninja lookup failed:", err);
    }
  }

  // For rares or if poe.ninja didn't have it, use trade API
  if (item.rarity === "Rare") {
    try {
      return await searchTrade(item, league);
    } catch (err) {
      console.error("Trade API search failed:", err);
    }
  }

  // No price found
  return {
    item,
    source: "unavailable",
    chaosValue: null,
    divineValue: null,
    confidence: "none",
    listingCount: null,
    priceRange: null,
    tradeUrl: null,
    timestamp: Date.now(),
  };
}
