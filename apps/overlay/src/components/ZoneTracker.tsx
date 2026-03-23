import { useState, useEffect } from "react";
import { useOverlayStore } from "../stores/overlay-store";
import { formatDuration } from "@poe-helper/shared";

export default function ZoneTracker() {
  const { currentZone, sessionDeaths, sessionStart } = useOverlayStore();
  const [elapsed, setElapsed] = useState(0);

  // Update session timer every second
  useEffect(() => {
    if (!sessionStart) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - sessionStart);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStart]);

  // Don't show if no session started
  if (!sessionStart && !currentZone) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 backdrop-blur-sm flex items-center justify-between"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Zone name */}
      <div className="flex-1 min-w-0 mr-3">
        <div className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
          {currentZone || "No zone"}
        </div>
      </div>

      {/* Session stats */}
      <div className="flex items-center gap-3 text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
        {/* Session timer */}
        {sessionStart && (
          <span title="Session time">
            {formatDuration(elapsed)}
          </span>
        )}

        {/* Death counter */}
        <span
          className={sessionDeaths > 0 ? "text-red-400" : ""}
          title="Deaths this session"
        >
          {sessionDeaths} death{sessionDeaths !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
