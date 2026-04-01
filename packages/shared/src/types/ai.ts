export interface ModTier {
  modText: string;
  tier: 1 | 2 | 3 | 4 | 5;
  tierName: string;
  explanation: string;
}

export interface AiPriceAnalysis {
  itemSummary: string;
  modTiers: ModTier[];
  priceRecommendation: {
    minChaos: number;
    maxChaos: number;
    confidence: "high" | "medium" | "low";
    reasoning: string;
  };
  craftAdvice: string | null;
  buyOrCraft: "buy" | "craft" | "either";
  buyOrCraftReason: string;
}

export interface MarketTrend {
  itemCategory: string;
  trend: "rising" | "falling" | "stable";
  changePercent: number;
  summary: string;
  topMovers: Array<{ name: string; change: number }>;
}

export interface TradeWhisperAnalysis {
  intent: "buy" | "sell" | "price_check" | "unknown";
  itemMentioned: string | null;
  suggestedResponse: string;
  isSuspiciousPrice: boolean;
  suspiciousReason: string | null;
}
