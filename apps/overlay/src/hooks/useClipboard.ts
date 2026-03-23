import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { parseItem, isPoEItem, analyzeMap } from "@poe-helper/shared";
import { useOverlayStore } from "../stores/overlay-store";
import { checkPrice } from "./usePriceCheck";

/**
 * Listen for clipboard-item events from the Rust backend.
 * When a PoE item is detected, parse it and route to the appropriate handler.
 */
export function useClipboard() {
  useEffect(() => {
    const unlisten = listen<string>("clipboard-item", async (event) => {
      const raw = event.payload;
      if (!isPoEItem(raw)) return;

      try {
        const item = parseItem(raw);

        // Route based on item class
        if (item.itemClass.toLowerCase().includes("map") || item.itemClass.toLowerCase().includes("waystone")) {
          // Map — show mod warnings
          const modTexts = item.explicits.map((m) => m.text);
          const analysis = analyzeMap(
            item.name || item.baseType,
            modTexts,
            item.game,
            item.mapTier
          );
          useOverlayStore.getState().setMapAnalysis(analysis);
        } else {
          // Item — show price check
          useOverlayStore.getState().setPriceCheck(item, null, true);

          // Fetch price asynchronously
          const result = await checkPrice(item);
          useOverlayStore.getState().setPriceCheck(item, result, false);
        }
      } catch (err) {
        console.error("Failed to parse clipboard item:", err);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
