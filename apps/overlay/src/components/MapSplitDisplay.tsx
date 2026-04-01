import { useEffect, useState } from "react";
import { useSpeedrunStore } from "../stores/speedrun-store";
import { formatDuration } from "@exiled-orb/shared";

/** Shows split time after completing a map — green if PB, red if slower */
export default function MapSplitDisplay() {
  const lastRun = useSpeedrunStore((s) => s.lastCompletedRun);
  const personalBests = useSpeedrunStore((s) => s.personalBests);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastRun) {
      setVisible(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastRun]);

  if (!visible || !lastRun || lastRun.totalMs == null) return null;

  const pb = personalBests.get(lastRun.mapName);
  const isPb = pb != null && lastRun.totalMs <= pb;
  const diff = pb != null ? lastRun.totalMs - pb : null;

  return (
    <div
      className="rounded-lg border px-3 py-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderColor: isPb ? "rgba(34, 197, 94, 0.5)" : "var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {lastRun.mapName} completed
        </span>
        <span className={`text-sm font-bold font-mono ${isPb ? "text-green-400" : ""}`} style={isPb ? {} : { color: "var(--text-primary)" }}>
          {formatDuration(lastRun.totalMs)}
        </span>
      </div>

      {diff != null && (
        <div className="text-right mt-0.5">
          <span className={`text-xs font-mono ${diff <= 0 ? "text-green-400" : "text-red-400"}`}>
            {diff <= 0 ? "PB! " : ""}
            {diff > 0 ? "+" : ""}{formatDuration(Math.abs(diff))}
          </span>
        </div>
      )}

      {lastRun.deaths > 0 && (
        <div className="text-xs text-red-400 mt-0.5">
          {lastRun.deaths} death{lastRun.deaths !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
