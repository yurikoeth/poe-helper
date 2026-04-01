import type { Game } from "./item.js";

export interface FlipRecord {
  id: string;
  game: Game;
  league: string;
  /** Item/currency being traded */
  itemName: string;
  /** "buy" or "sell" */
  direction: "buy" | "sell";
  /** Amount of the item */
  quantity: number;
  /** Price per unit in chaos */
  pricePerUnit: number;
  /** Total chaos cost/revenue */
  totalChaos: number;
  /** Player traded with */
  playerName: string;
  /** Timestamp */
  timestamp: number;
}

export interface FlipSession {
  id: string;
  game: Game;
  league: string;
  startedAt: number;
  endedAt: number | null;
  trades: FlipRecord[];
  totalBuyChaos: number;
  totalSellChaos: number;
  netProfitChaos: number;
  tradeCount: number;
}

/** Parse a standard trade whisper to extract trade info */
export function parseTradeWhisper(message: string): {
  itemName: string;
  amount: number;
  price: number;
  currency: string;
} | null {
  // Standard PoE trade whisper format:
  // "Hi, I would like to buy your [amount] [item] for my [price] [currency] in [league]."
  // Or: "Hi, I would like to buy your [item] listed for [price] [currency] in [league]"

  const bulkMatch = message.match(
    /buy your (\d+(?:\.\d+)?)\s+(.+?)\s+for (?:my )?(\d+(?:\.\d+)?)\s+(\w+)/i
  );
  if (bulkMatch) {
    return {
      amount: parseFloat(bulkMatch[1]),
      itemName: bulkMatch[2].trim(),
      price: parseFloat(bulkMatch[3]),
      currency: bulkMatch[4],
    };
  }

  const singleMatch = message.match(
    /buy your (.+?) listed for (\d+(?:\.\d+)?)\s+(\w+)/i
  );
  if (singleMatch) {
    return {
      itemName: singleMatch[1].trim(),
      amount: 1,
      price: parseFloat(singleMatch[2]),
      currency: singleMatch[3],
    };
  }

  return null;
}
