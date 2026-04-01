import { useAiStore } from "../stores/ai-store";
import WitchSays from "./WitchSays";

const tierColors: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-green-400",
  3: "text-blue-400",
  4: "text-gray-400",
  5: "text-gray-500",
};

/** AI-powered price insight panel, shown below PriceCheck */
export default function AiPriceInsight() {
  const { currentAnalysis, analysisLoading } = useAiStore();

  if (analysisLoading) {
    return (
      <WitchSays title="Analyzing...">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)" }} />
          <span style={{ color: "var(--text-secondary)" }}>Examining this item...</span>
        </div>
      </WitchSays>
    );
  }

  if (!currentAnalysis) return null;

  const { modTiers, priceRecommendation, craftAdvice, itemSummary } = currentAnalysis;

  const confColors = {
    high: "text-green-400",
    medium: "text-yellow-400",
    low: "text-red-400",
  };

  return (
    <WitchSays title="Price Insight">
      <div className="space-y-2">
        <p style={{ color: "var(--text-secondary)" }}>{itemSummary}</p>

        {modTiers.length > 0 && (
          <div className="space-y-0.5">
            {modTiers.map((mod, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`font-bold shrink-0 ${tierColors[mod.tier] || "text-gray-400"}`}>
                  {mod.tierName}
                </span>
                <span className="truncate" style={{ color: "var(--text-primary)" }}>
                  {mod.modText}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Recommended</span>
            <span className="font-bold" style={{ color: "var(--text-primary)", fontSize: "0.8rem" }}>
              {priceRecommendation.minChaos}–{priceRecommendation.maxChaos}c
            </span>
          </div>
          <div className={confColors[priceRecommendation.confidence]}>
            {priceRecommendation.confidence} confidence — {priceRecommendation.reasoning}
          </div>
        </div>

        {craftAdvice && (
          <div style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold" style={{ color: "var(--accent)" }}>Craft: </span>
            {craftAdvice}
          </div>
        )}
      </div>
    </WitchSays>
  );
}
