import { useEffect, useState } from "react";
import PriceCheck from "./components/PriceCheck";
import MapModWarnings from "./components/MapModWarnings";
import ZoneTracker from "./components/ZoneTracker";
import MapTimer from "./components/MapTimer";
import SpeedrunStats from "./components/SpeedrunStats";
import MapSplitDisplay from "./components/MapSplitDisplay";
import AiPriceInsight from "./components/AiPriceInsight";
import TradeAssistant from "./components/TradeAssistant";
import LevelingGuide from "./components/LevelingGuide";
import FlipTracker from "./components/FlipTracker";
import AtlasHelper from "./components/AtlasHelper";
import GggAccount from "./components/GggAccount";
import AskAi from "./components/AskAi";
import MarketTab from "./components/MarketTab";
import { useFlipTracker } from "./hooks/useFlipTracker";
import { useClipboard } from "./hooks/useClipboard";
import { useClientLog } from "./hooks/useClientLog";
import { useMapSpeedrun } from "./hooks/useMapSpeedrun";
import { useTradeWhispers } from "./hooks/useTradeWhispers";
import { useOverlayStore } from "./stores/overlay-store";
import { useSettingsStore } from "./stores/settings-store";
import { useSpeedrunStore } from "./stores/speedrun-store";
import { useBuildStore } from "./stores/build-store";

import menuMarket from "./assets/menu/market.png";
import menuLeveling from "./assets/menu/leveling.png";
import menuAtlas from "./assets/menu/atlas.png";
import menuMaps from "./assets/menu/maps.png";
import menuFlips from "./assets/menu/flips.png";
import menuAsk from "./assets/menu/ask.png";
import menuChar from "./assets/menu/char.png";

type Page = "home" | "market" | "leveling" | "atlas" | "maps" | "flips" | "ask" | "char";

const MENU_ITEMS: { id: Page; label: string; desc: string; bg: string }[] = [
  { id: "market", label: "Market", desc: "Live prices from poe.ninja", bg: menuMarket },
  { id: "leveling", label: "Leveling", desc: "Act-by-act progression", bg: menuLeveling },
  { id: "atlas", label: "Atlas", desc: "Farming strategies", bg: menuAtlas },
  { id: "maps", label: "Maps", desc: "Speedrun timer & stats", bg: menuMaps },
  { id: "flips", label: "Flips", desc: "Currency profit tracker", bg: menuFlips },
  { id: "ask", label: "Ask AI", desc: "Ask anything about PoE", bg: menuAsk },
  { id: "char", label: "Characters", desc: "Gear & build analysis", bg: menuChar },
];

export default function App() {
  const { activePanel } = useOverlayStore();
  const currentRun = useSpeedrunStore((s) => s.currentRun);
  const [page, setPage] = useState<Page>("home");

  // Load settings and builds on startup
  useEffect(() => {
    useSettingsStore.getState().loadSettings();
    useBuildStore.getState().loadBuilds();
  }, []);

  // Start listening for clipboard and log events
  useClipboard();
  useClientLog();
  useMapSpeedrun();
  useTradeWhispers();
  useFlipTracker();

  // Listen for toggle hotkey
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        useOverlayStore.getState().toggleVisibility();
      }
      if (e.key === "Escape") {
        if (page !== "home") {
          setPage("home");
        } else {
          useOverlayStore.getState().dismissPanel();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [page]);

  const visible = useOverlayStore((s) => s.visible);
  if (!visible) return null;

  return (
    <div className="w-full min-h-0 h-screen flex flex-col gap-2 p-2 overflow-y-auto">
      {/* Zone tracker — always visible, click to go home */}
      <div onClick={() => setPage("home")} className={page !== "home" ? "cursor-pointer" : ""}>
        {currentRun ? <MapTimer /> : <ZoneTracker />}
      </div>


      {/* HOME — menu grid + live panels */}
      {page === "home" && (
        <>
          {/* Price check + AI insight (triggered by Ctrl+C) */}
          {activePanel === "price" && <PriceCheck />}
          {activePanel === "price" && <AiPriceInsight />}
          {activePanel === "map" && <MapModWarnings />}
          <MapSplitDisplay />
          <SpeedrunStats />
          <TradeAssistant />

          {/* Menu grid */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className="rounded border px-3 py-4 text-left hover:brightness-125 transition-all relative overflow-hidden group"
                style={{
                  background: "linear-gradient(180deg, rgba(24,24,28,0.95) 0%, rgba(14,14,18,0.95) 100%)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{
                    backgroundImage: `url(${item.bg})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right center",
                  }}
                />
                <div className="relative z-10">
                  <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                    {item.label}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    {item.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* PAGES */}
      {page === "market" && <MarketTab />}
      {page === "leveling" && <LevelingGuide />}
      {page === "atlas" && <AtlasHelper />}
      {page === "maps" && (
        <>
          {currentRun && <MapSplitDisplay />}
          <SpeedrunStats />
          <FlipTracker />
          {!currentRun && (
            <HintPanel title="Map Grinding Tracker" lines={[
              "Enter a map to start tracking automatically.",
              "• Live timer per map",
              "• Maps per hour & average clear time",
              "• Personal bests + split comparisons",
              "• Deaths per map",
            ]} />
          )}
        </>
      )}
      {page === "flips" && (
        <>
          <FlipTracker />
          <HintPanel title="Currency Flip Tracker" lines={[
            "Automatically tracks buy/sell trade whispers.",
            "• Running profit/loss",
            "• Buy vs sell totals",
            "• Recent trade history",
          ]} />
        </>
      )}
      {page === "ask" && <AskAi />}
      {page === "char" && <GggAccount />}
    </div>
  );
}

function HintPanel({ title, lines }: { title?: string; lines: string[] }) {
  return (
    <div
      className="rounded border px-3 py-2"
      style={{
        background: "linear-gradient(180deg, rgba(24,24,28,0.9) 0%, rgba(14,14,18,0.9) 100%)",
        borderColor: "var(--border-color)",
      }}
    >
      {title && (
        <div className="text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: "var(--accent)" }}>
          {title}
        </div>
      )}
      <div className="text-xs space-y-0.5" style={{ color: "var(--text-secondary)" }}>
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
