import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import type { FlipRecord, FlipSession } from "@exiled-orb/shared";
import { parseTradeWhisper } from "@exiled-orb/shared";
import { useSettingsStore } from "../stores/settings-store";

interface FlipState {
  session: FlipSession | null;
  recentTrades: FlipRecord[];

  startSession: () => void;
  addTrade: (trade: FlipRecord) => void;
  endSession: () => void;
}

let nextId = 1;

export const useFlipStore = create<FlipState>((set, get) => ({
  session: null,
  recentTrades: [],

  startSession: () => {
    const settings = useSettingsStore.getState().settings;
    set({
      session: {
        id: `flip-${Date.now()}-${nextId++}`,
        game: settings.game,
        league: settings.league,
        startedAt: Date.now(),
        endedAt: null,
        trades: [],
        totalBuyChaos: 0,
        totalSellChaos: 0,
        netProfitChaos: 0,
        tradeCount: 0,
      },
    });
  },

  addTrade: (trade) => {
    set((s) => {
      if (!s.session) return s;
      const trades = [...s.session.trades, trade];
      const totalBuyChaos = trades
        .filter((t) => t.direction === "buy")
        .reduce((sum, t) => sum + t.totalChaos, 0);
      const totalSellChaos = trades
        .filter((t) => t.direction === "sell")
        .reduce((sum, t) => sum + t.totalChaos, 0);

      return {
        session: {
          ...s.session,
          trades,
          totalBuyChaos,
          totalSellChaos,
          netProfitChaos: totalSellChaos - totalBuyChaos,
          tradeCount: trades.length,
        },
        recentTrades: [trade, ...s.recentTrades.slice(0, 9)],
      };
    });
  },

  endSession: () => {
    set((s) => {
      if (!s.session) return s;
      return { session: { ...s.session, endedAt: Date.now() } };
    });
  },
}));

interface LogEventPayload {
  event_type: string;
  player_name?: string;
  message?: string;
  direction?: string;
}

/**
 * Hook that monitors trade whispers and tracks buy/sell activity for flip tracking.
 */
export function useFlipTracker() {
  useEffect(() => {
    const unlisten = listen<LogEventPayload>("log-event", (event) => {
      const payload = event.payload;
      if (payload.event_type !== "whisper") return;

      const message = payload.message ?? "";
      const parsed = parseTradeWhisper(message);
      if (!parsed) return;

      const store = useFlipStore.getState();

      // Auto-start session on first trade
      if (!store.session) {
        store.startSession();
      }

      const settings = useSettingsStore.getState().settings;
      const direction = payload.direction === "outgoing" ? "buy" : "sell";

      // Simple chaos conversion for common currencies
      let priceInChaos = parsed.price;
      const curr = parsed.currency.toLowerCase();
      if (curr === "divine" || curr === "div") priceInChaos *= 200;
      else if (curr === "exalted" || curr === "exa") priceInChaos *= 15;

      const trade: FlipRecord = {
        id: `${Date.now()}-${nextId++}`,
        game: settings.game,
        league: settings.league,
        itemName: parsed.itemName,
        direction,
        quantity: parsed.amount,
        pricePerUnit: priceInChaos / parsed.amount,
        totalChaos: priceInChaos,
        playerName: payload.player_name ?? "unknown",
        timestamp: Date.now(),
      };

      store.addTrade(trade);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
