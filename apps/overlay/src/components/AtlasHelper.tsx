import { useState } from "react";
import { useSettingsStore } from "../stores/settings-store";
import { getStrategies } from "@exiled-orb/shared";
import type { AtlasStrategy } from "@exiled-orb/shared";

const difficultyColors = {
  beginner: "text-green-400",
  intermediate: "text-yellow-400",
  advanced: "text-red-400",
};

/** Atlas strategy helper — shows recommended farming strategies */
export default function AtlasHelper() {
  const game = useSettingsStore((s) => s.settings.game);
  const strategies = getStrategies(game);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (strategies.length === 0) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 backdrop-blur-sm"
      style={{ backgroundColor: "var(--bg-panel)", borderColor: "var(--border-color)" }}
    >
      <div className="text-xs font-bold mb-2" style={{ color: "var(--accent)" }}>
        Atlas Strategies ({game.toUpperCase()})
      </div>

      <div className="space-y-1">
        {strategies.map((strat) => (
          <StrategyCard
            key={strat.id}
            strategy={strat}
            expanded={expanded === strat.id}
            onToggle={() => setExpanded(expanded === strat.id ? null : strat.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StrategyCard({
  strategy,
  expanded,
  onToggle,
}: {
  strategy: AtlasStrategy;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded border px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)" }}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
          {strategy.name}
        </span>
        <span className={`text-xs ${difficultyColors[strategy.difficulty]}`}>
          {strategy.difficulty}
        </span>
      </div>

      {/* Chaos/hr estimate */}
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {strategy.expectedChaosPerHour.min}–{strategy.expectedChaosPerHour.max}c/hr
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-1.5 pt-1.5 border-t space-y-1" style={{ borderColor: "var(--border-color)" }}>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {strategy.description}
          </p>

          <div className="text-xs">
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>Maps: </span>
            <span style={{ color: "var(--text-secondary)" }}>
              {strategy.recommendedMaps.join(", ")}
            </span>
          </div>

          <div className="text-xs">
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>Key Passives:</span>
            {strategy.keyPassives.map((p, i) => (
              <div key={i} style={{ color: "var(--text-secondary)" }}>• {p}</div>
            ))}
          </div>

          <div className="text-xs">
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>Game Plan:</span>
            {strategy.gamePlan.map((p, i) => (
              <div key={i} style={{ color: "var(--text-secondary)" }}>• {p}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
