import { useState, useEffect } from "react";
import { useSpeedrunStore } from "../stores/speedrun-store";
import { formatDuration } from "@exiled-orb/shared";

/** Session stats HUD: maps/hour, avg time, deaths */
export default function SpeedrunStats() {
  const session = useSpeedrunStore((s) => s.session);
  const [, forceUpdate] = useState(0);

  // Re-render every 5 seconds to update maps/hour
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => forceUpdate((n) => n + 1), 5000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session || session.completedMaps === 0) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 backdrop-blur-sm"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Maps / Hour */}
        <div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Maps/hr</div>
          <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {session.mapsPerHour != null ? session.mapsPerHour.toFixed(1) : "—"}
          </div>
        </div>

        {/* Avg Time */}
        <div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Avg Time</div>
          <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {session.avgMapTimeMs != null ? formatDuration(session.avgMapTimeMs) : "—"}
          </div>
        </div>

        {/* Total Maps */}
        <div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Maps</div>
          <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {session.completedMaps}
          </div>
        </div>
      </div>

      {/* Second row: Deaths + Fastest */}
      <div className="grid grid-cols-2 gap-2 text-center mt-1 pt-1 border-t" style={{ borderColor: "var(--border-color)" }}>
        <div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Deaths</div>
          <div className={`text-sm font-bold ${session.totalDeaths > 0 ? "text-red-400" : ""}`} style={session.totalDeaths === 0 ? { color: "var(--text-primary)" } : {}}>
            {session.totalDeaths}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Fastest</div>
          <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            {session.fastestMapMs != null ? formatDuration(session.fastestMapMs) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
