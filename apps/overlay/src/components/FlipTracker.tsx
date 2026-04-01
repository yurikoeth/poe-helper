import { useFlipStore } from "../hooks/useFlipTracker";
import { formatNumber } from "@exiled-orb/shared";

/** Currency flip tracker overlay — shows running profit from trades */
export default function FlipTracker() {
  const session = useFlipStore((s) => s.session);
  const recentTrades = useFlipStore((s) => s.recentTrades);

  if (!session || session.tradeCount === 0) return null;

  const profitColor = session.netProfitChaos >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div
      className="rounded-lg border px-3 py-2 backdrop-blur-sm"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
          Flip Tracker
        </span>
        <span className={`text-sm font-bold ${profitColor}`}>
          {session.netProfitChaos >= 0 ? "+" : ""}
          {formatNumber(Math.round(session.netProfitChaos))}c
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-1">
        <div>
          <div style={{ color: "var(--text-secondary)" }}>Bought</div>
          <div style={{ color: "var(--text-primary)" }}>{formatNumber(Math.round(session.totalBuyChaos))}c</div>
        </div>
        <div>
          <div style={{ color: "var(--text-secondary)" }}>Sold</div>
          <div style={{ color: "var(--text-primary)" }}>{formatNumber(Math.round(session.totalSellChaos))}c</div>
        </div>
        <div>
          <div style={{ color: "var(--text-secondary)" }}>Trades</div>
          <div style={{ color: "var(--text-primary)" }}>{session.tradeCount}</div>
        </div>
      </div>

      {/* Recent trades */}
      {recentTrades.length > 0 && (
        <div className="border-t pt-1 space-y-0.5" style={{ borderColor: "var(--border-color)" }}>
          {recentTrades.slice(0, 3).map((trade) => (
            <div key={trade.id} className="flex items-center justify-between text-xs">
              <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                {trade.direction === "buy" ? "Bought" : "Sold"} {trade.quantity > 1 ? `${trade.quantity}x ` : ""}
                {trade.itemName}
              </span>
              <span className={trade.direction === "sell" ? "text-green-400" : "text-red-400"} >
                {trade.direction === "sell" ? "+" : "-"}{Math.round(trade.totalChaos)}c
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
