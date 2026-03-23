import { useEffect, useRef } from "react";
import { useOverlayStore } from "../stores/overlay-store";
import { formatPrice, formatPriceRange, OVERLAY_DEFAULTS } from "@poe-helper/shared";

/** Estimated divine rate — in production, fetch from poe.ninja */
const DIVINE_RATE = 200;

/** Confidence badge colors */
const confidenceColors = {
  exact: "bg-green-600",
  fuzzy: "bg-yellow-600",
  low: "bg-orange-600",
  none: "bg-red-600",
};

export default function PriceCheck() {
  const { currentItem, priceResult, priceLoading, dismissPanel } = useOverlayStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after fade timeout
  useEffect(() => {
    if (priceResult && !priceLoading) {
      timerRef.current = setTimeout(() => {
        dismissPanel();
      }, OVERLAY_DEFAULTS.priceCheckFadeMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [priceResult, priceLoading, dismissPanel]);

  if (!currentItem) return null;

  const rarityColors: Record<string, string> = {
    Normal: "text-gray-300",
    Magic: "text-blue-400",
    Rare: "text-yellow-400",
    Unique: "text-orange-400",
    Currency: "text-amber-300",
    Gem: "text-teal-400",
    "Divination Card": "text-cyan-300",
  };

  return (
    <div
      className="rounded-lg border p-3 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Item header */}
      <div className="mb-2">
        <div className={`text-sm font-bold ${rarityColors[currentItem.rarity] || "text-gray-300"}`}>
          {currentItem.name || currentItem.baseType}
        </div>
        {currentItem.name && (
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {currentItem.baseType}
          </div>
        )}
        <div className="flex gap-2 mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          {currentItem.itemLevel && <span>iLvl {currentItem.itemLevel}</span>}
          {currentItem.links && currentItem.links >= 5 && <span>{currentItem.links}L</span>}
          {currentItem.corrupted && <span className="text-red-400">Corrupted</span>}
          {currentItem.gemLevel && <span>Lv.{currentItem.gemLevel}</span>}
        </div>
      </div>

      {/* Price result */}
      {priceLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)" }} />
          Checking price...
        </div>
      ) : priceResult ? (
        <div>
          {priceResult.chaosValue !== null ? (
            <>
              {/* Main price */}
              <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {formatPrice(priceResult.chaosValue, DIVINE_RATE)}
              </div>

              {/* Price range */}
              {priceResult.priceRange && (
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Range: {formatPriceRange(priceResult.priceRange, DIVINE_RATE)}
                </div>
              )}

              {/* Confidence + source */}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${confidenceColors[priceResult.confidence]}`}>
                  {priceResult.confidence}
                </span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  via {priceResult.source}
                </span>
                {priceResult.listingCount !== null && (
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    ({priceResult.listingCount} listings)
                  </span>
                )}
              </div>

              {/* Trade link */}
              {priceResult.tradeUrl && (
                <a
                  href={priceResult.tradeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs mt-1 block hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  Open in trade site
                </a>
              )}
            </>
          ) : (
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No price data found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
