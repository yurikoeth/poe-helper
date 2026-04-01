import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { parseItem, isPoEItem, analyzeMap } from "@exiled-orb/shared";
import { useOverlayStore } from "../stores/overlay-store";
import { useSettingsStore } from "../stores/settings-store";
import { checkPrice } from "./usePriceCheck";
import { analyzeItemWithAi } from "./useAiAnalysis";

/**
 * Listen for clipboard-item events from the Rust backend.
 * When a PoE item is detected, parse it and route to the appropriate handler.
 */
export function useClipboard() {
  useEffect(() => {
    console.log("[ExiledOrb] Clipboard hook mounted, listening for items...");
    const unlisten = listen<string>("clipboard-item", async (event) => {
      const raw = event.payload;
      console.log("[ExiledOrb] Clipboard event received, length:", raw.length, "preview:", raw.substring(0, 80));
      if (!isPoEItem(raw)) {
        console.log("[ExiledOrb] Not a PoE item, ignoring");
        return;
      }

      try {
        const item = parseItem(raw);
        console.log("[ExiledOrb] Parsed item:", item.rarity, item.name || item.baseType, "class:", item.itemClass, "game:", item.game);

        // Route based on item class
        if (item.itemClass.toLowerCase().includes("map") || item.itemClass.toLowerCase().includes("waystone")) {
          // Map — show mod warnings
          const modTexts = item.explicits.map((m) => m.text);
          const buildProfile = useSettingsStore.getState().settings.build;
          const analysis = analyzeMap(
            item.name || item.baseType,
            modTexts,
            item.game,
            item.mapTier,
            buildProfile
          );
          useOverlayStore.getState().setMapAnalysis(analysis);
        } else {
          // Item — show price check
          useOverlayStore.getState().setPriceCheck(item, null, true);

          // Fetch price asynchronously
          const result = await checkPrice(item);
          console.log("[ExiledOrb] Price result:", result.source, result.chaosValue, result.confidence);
          useOverlayStore.getState().setPriceCheck(item, result, false);

          // Trigger AI analysis in the background (non-blocking)
          analyzeItemWithAi(item, result).catch(() => {});
        }
      } catch (err) {
        console.error("[ExiledOrb] Failed to parse clipboard item:", err);
        // Show error in the UI so user knows something went wrong
        useOverlayStore.getState().setPriceCheck(
          { raw, game: "poe1", itemClass: "", rarity: "Normal", name: null, baseType: "Parse Error", itemLevel: null, quality: null, sockets: null, links: null, implicits: [], explicits: [], enchants: [], corrupted: false, mirrored: false, unidentified: false, influences: [], stackSize: null, mapTier: null, gemLevel: null, requirements: {}, properties: {} },
          { item: null as any, source: "unavailable", chaosValue: null, divineValue: null, confidence: "none", listingCount: null, priceRange: null, tradeUrl: null, timestamp: Date.now() },
          false
        );
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
