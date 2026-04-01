import { create } from "zustand";
import type { AiPriceAnalysis, MarketTrend, TradeWhisperAnalysis } from "@exiled-orb/shared";

interface AiState {
  /** Current item price analysis */
  currentAnalysis: AiPriceAnalysis | null;
  analysisLoading: boolean;

  /** Market trends (updated periodically) */
  marketTrends: MarketTrend | null;
  trendsLoading: boolean;

  /** Recent trade whisper analyses */
  whisperAnalyses: Array<{
    whisperText: string;
    analysis: TradeWhisperAnalysis;
    timestamp: number;
  }>;

  /** Daily API usage counter */
  dailyTokensUsed: number;
  dailyResetAt: number;

  // Actions
  setAnalysis: (analysis: AiPriceAnalysis | null, loading: boolean) => void;
  setMarketTrends: (trends: MarketTrend | null, loading: boolean) => void;
  addWhisperAnalysis: (whisper: string, analysis: TradeWhisperAnalysis) => void;
  addTokenUsage: (tokens: number) => void;
  clearAnalysis: () => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  currentAnalysis: null,
  analysisLoading: false,
  marketTrends: null,
  trendsLoading: false,
  whisperAnalyses: [],
  dailyTokensUsed: 0,
  dailyResetAt: getNextMidnight(),

  setAnalysis: (analysis, loading) => set({ currentAnalysis: analysis, analysisLoading: loading }),

  setMarketTrends: (trends, loading) => set({ marketTrends: trends, trendsLoading: loading }),

  addWhisperAnalysis: (whisper, analysis) =>
    set((s) => ({
      whisperAnalyses: [
        { whisperText: whisper, analysis, timestamp: Date.now() },
        ...s.whisperAnalyses.slice(0, 19), // Keep last 20
      ],
    })),

  addTokenUsage: (tokens) => {
    const state = get();
    // Reset counter if past midnight
    if (Date.now() > state.dailyResetAt) {
      set({ dailyTokensUsed: tokens, dailyResetAt: getNextMidnight() });
    } else {
      set({ dailyTokensUsed: state.dailyTokensUsed + tokens });
    }
  },

  clearAnalysis: () => set({ currentAnalysis: null, analysisLoading: false }),
}));

function getNextMidnight(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}
