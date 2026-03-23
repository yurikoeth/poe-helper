import { useEffect } from "react";
import PriceCheck from "./components/PriceCheck";
import MapModWarnings from "./components/MapModWarnings";
import ZoneTracker from "./components/ZoneTracker";
import { useClipboard } from "./hooks/useClipboard";
import { useClientLog } from "./hooks/useClientLog";
import { useOverlayStore } from "./stores/overlay-store";

export default function App() {
  const { activePanel } = useOverlayStore();

  // Start listening for clipboard and log events
  useClipboard();
  useClientLog();

  // Listen for toggle hotkey
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        useOverlayStore.getState().toggleVisibility();
      }
      if (e.key === "Escape") {
        useOverlayStore.getState().dismissPanel();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const visible = useOverlayStore((s) => s.visible);
  if (!visible) return null;

  return (
    <div className="w-[420px] min-h-0 max-h-[650px] flex flex-col gap-2 p-2">
      {/* Zone tracker is always visible as a small HUD */}
      <ZoneTracker />

      {/* Context-sensitive panels */}
      {activePanel === "price" && <PriceCheck />}
      {activePanel === "map" && <MapModWarnings />}
    </div>
  );
}
