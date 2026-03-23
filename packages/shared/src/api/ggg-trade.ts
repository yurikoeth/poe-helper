import type { Game, ParsedItem, PriceResult } from "../types/index.js";
import { RateLimiter } from "./rate-limiter.js";

/** GGG Trade API base URLs */
const TRADE_URLS: Record<Game, string> = {
  poe1: "https://www.pathofexile.com/api/trade",
  poe2: "https://www.pathofexile.com/api/trade2",
};

/** Rate limiter for GGG Trade API (12 requests per 10 seconds) */
const tradeLimiter = new RateLimiter(12, 10_000);

/** Build a trade search query for a rare item */
function buildRareQuery(item: ParsedItem, league: string) {
  const filters: Record<string, unknown> = {};

  // Type filter
  const typeFilters: Record<string, unknown> = {};
  if (item.baseType) {
    typeFilters.type = { option: item.baseType };
  }
  if (item.itemClass) {
    typeFilters.category = { option: item.itemClass.toLowerCase().replace(/\s+/g, ".") };
  }
  filters.type_filters = { filters: typeFilters };

  // Mod filters — use the top 3 most valuable-looking mods
  const statFilters: Array<{ id: string; value: { min: number } }> = [];
  for (const mod of item.explicits.slice(0, 3)) {
    // Extract numeric values from mod text
    const numMatch = mod.text.match(/(\d+)/);
    if (numMatch) {
      // Use pseudo stat IDs — in practice we'd need a mod-to-stat mapping
      statFilters.push({
        id: `explicit.stat_placeholder`,
        value: { min: Math.floor(parseInt(numMatch[1], 10) * 0.8) },
      });
    }
  }

  return {
    query: {
      status: { option: "online" },
      stats: statFilters.length > 0 ? [{ type: "and", filters: statFilters }] : [],
      filters,
    },
    sort: { price: "asc" },
  };
}

/** Search the GGG Trade API for item prices */
export async function searchTrade(
  item: ParsedItem,
  league: string
): Promise<PriceResult> {
  const baseUrl = TRADE_URLS[item.game];

  try {
    await tradeLimiter.acquire();

    const query = buildRareQuery(item, league);
    const searchUrl = `${baseUrl}/search/${encodeURIComponent(league)}`;

    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });

    // Update rate limits from response headers
    tradeLimiter.updateFromHeaders(searchRes.headers);

    if (!searchRes.ok) {
      return {
        item,
        source: "trade",
        chaosValue: null,
        divineValue: null,
        confidence: "none",
        listingCount: null,
        priceRange: null,
        tradeUrl: null,
        timestamp: Date.now(),
      };
    }

    const searchData = await searchRes.json();
    const resultIds: string[] = searchData.result || [];
    const total: number = searchData.total || 0;
    const tradeSearchId: string = searchData.id || "";

    if (resultIds.length === 0) {
      return {
        item,
        source: "trade",
        chaosValue: null,
        divineValue: null,
        confidence: "none",
        listingCount: 0,
        priceRange: null,
        tradeUrl: `${baseUrl.replace("/api/trade", "/trade")}/search/${league}/${tradeSearchId}`,
        timestamp: Date.now(),
      };
    }

    // Fetch first 10 results for price estimation
    await tradeLimiter.acquire();
    const fetchIds = resultIds.slice(0, 10).join(",");
    const fetchRes = await fetch(`${baseUrl}/fetch/${fetchIds}`, {
      headers: { "Content-Type": "application/json" },
    });
    tradeLimiter.updateFromHeaders(fetchRes.headers);

    if (!fetchRes.ok) {
      return {
        item,
        source: "trade",
        chaosValue: null,
        divineValue: null,
        confidence: "low",
        listingCount: total,
        priceRange: null,
        tradeUrl: `${baseUrl.replace("/api/trade", "/trade")}/search/${league}/${tradeSearchId}`,
        timestamp: Date.now(),
      };
    }

    const fetchData = await fetchRes.json();
    const listings = fetchData.result || [];

    // Extract prices from listings
    const prices: number[] = [];
    for (const listing of listings) {
      const price = listing?.listing?.price;
      if (price) {
        let chaosAmount = price.amount || 0;
        // Convert common currencies to chaos equivalent
        if (price.currency === "divine") {
          chaosAmount *= 200; // Rough estimate, should use poe.ninja rate
        }
        prices.push(chaosAmount);
      }
    }

    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

    return {
      item,
      source: "trade",
      chaosValue: avgPrice,
      divineValue: avgPrice ? avgPrice / 200 : null,
      confidence: total > 10 ? "fuzzy" : "low",
      listingCount: total,
      priceRange: minPrice !== null && maxPrice !== null ? [minPrice, maxPrice] : null,
      tradeUrl: `${baseUrl.replace("/api/trade", "/trade")}/search/${league}/${tradeSearchId}`,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      item,
      source: "trade",
      chaosValue: null,
      divineValue: null,
      confidence: "none",
      listingCount: null,
      priceRange: null,
      tradeUrl: null,
      timestamp: Date.now(),
    };
  }
}

/** Get the trade limiter status */
export function getTradeRateStatus() {
  return tradeLimiter.status;
}
