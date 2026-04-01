import { invoke } from "@tauri-apps/api/core";
import { useAiStore } from "../stores/ai-store";
import { useSettingsStore } from "../stores/settings-store";
import { getApiKey } from "../utils/store";
import type { ParsedItem, PriceResult, AiPriceAnalysis } from "@exiled-orb/shared";

/** Cache of recent AI analyses keyed by item hash */
const analysisCache = new Map<string, AiPriceAnalysis>();

/** Simple hash for an item (name + base type + mods) */
function itemHash(item: ParsedItem): string {
  const mods = item.explicits.map((m) => m.text).join("|");
  return `${item.name}:${item.baseType}:${mods}`;
}


/**
 * Analyze an item's price with Claude AI.
 * Called after the basic price check completes.
 */
export async function analyzeItemWithAi(
  item: ParsedItem,
  priceResult: PriceResult | null
): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  if (!settings.ai.enabled) return;

  const hash = itemHash(item);

  // Check cache
  const cached = analysisCache.get(hash);
  if (cached) {
    useAiStore.getState().setAnalysis(cached, false);
    return;
  }

  const apiKey = await getApiKey();
  if (!apiKey) return;

  useAiStore.getState().setAnalysis(null, true);

  try {
    const itemJson = JSON.stringify({
      name: item.name,
      baseType: item.baseType,
      rarity: item.rarity,
      itemLevel: item.itemLevel,
      explicits: item.explicits.map((m) => m.text),
      implicits: item.implicits.map((m) => m.text),
      corrupted: item.corrupted,
      links: item.links,
      game: item.game,
    });

    const marketContext = JSON.stringify({
      currentPrice: priceResult?.chaosValue ?? null,
      source: priceResult?.source ?? null,
      confidence: priceResult?.confidence ?? null,
      listingCount: priceResult?.listingCount ?? null,
      league: settings.league,
    });

    const result: string = await invoke("analyze_item_price", {
      apiKey,
      itemJson,
      marketContext,
    });

    const analysis: AiPriceAnalysis = JSON.parse(result);
    analysisCache.set(hash, analysis);
    useAiStore.getState().setAnalysis(analysis, false);
  } catch (err) {
    console.error("[ExiledOrb] AI analysis failed:", err);
    useAiStore.getState().setAnalysis(null, false);
  }
}
