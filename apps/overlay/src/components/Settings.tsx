import { useState, useEffect } from "react";
import { useSettingsStore } from "../stores/settings-store";
import { getApiKey, saveApiKey } from "../utils/store";
import type { AppSettings, Game, BuildProfile, AiConfig } from "@exiled-orb/shared";

type Tab = "general" | "overlay" | "build" | "ai";

const DAMAGE_OPTIONS = ["physical", "elemental", "spell", "chaos", "dot", "ignite", "cold-dot", "lightning", "poison", "bleed", "impale", "minion", "totem"];
const DEFENSE_OPTIONS = ["armour", "evasion", "energy-shield", "block", "dodge", "suppression", "ward"];
const RECOVERY_OPTIONS = ["leech", "regen", "life-flask", "es-recharge", "mana-regen", "life-on-hit"];

export default function Settings() {
  const { settings, updateSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<Tab>("general");

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "overlay", label: "Overlay" },
    { id: "build", label: "Build Profile" },
    { id: "ai", label: "AI Trading" },
  ];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--bg-primary, #0f0f14)", color: "var(--text-primary, #e2e2e8)" }}>
      <h1 className="text-xl font-bold mb-4">ExiledOrb Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "var(--border-color, rgba(100,100,120,0.3))" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.id ? "border-b-2" : "opacity-60 hover:opacity-80"
            }`}
            style={activeTab === tab.id ? { borderColor: "var(--accent, #7c6cff)", color: "var(--accent, #7c6cff)" } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "general" && <GeneralTab settings={settings} onUpdate={updateSettings} />}
      {activeTab === "overlay" && <OverlayTab settings={settings} onUpdate={updateSettings} />}
      {activeTab === "build" && <BuildTab settings={settings} onUpdate={updateSettings} />}
      {activeTab === "ai" && <AiTab settings={settings} onUpdate={updateSettings} />}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary, #9090a0)" }}>{children}</label>;
}

function GeneralTab({ settings, onUpdate }: { settings: AppSettings; onUpdate: (p: Partial<AppSettings>) => Promise<void> }) {
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <SectionLabel>Game</SectionLabel>
        <select
          value={settings.game}
          onChange={(e) => onUpdate({ game: e.target.value as Game })}
          className="w-full px-3 py-2 rounded text-sm"
          style={{ backgroundColor: "var(--bg-panel, #191923)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
        >
          <option value="poe1">Path of Exile 1</option>
          <option value="poe2">Path of Exile 2</option>
        </select>
      </div>

      <div>
        <SectionLabel>League</SectionLabel>
        <input
          type="text"
          value={settings.league}
          onChange={(e) => onUpdate({ league: e.target.value })}
          placeholder="e.g. Settlers of Kalguur"
          className="w-full px-3 py-2 rounded text-sm"
          style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
        />
      </div>

      <div>
        <SectionLabel>Client.txt Path</SectionLabel>
        <div className="flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            checked={settings.autoDetectLog}
            onChange={(e) => onUpdate({ autoDetectLog: e.target.checked })}
          />
          <span className="text-sm">Auto-detect</span>
        </div>
        {!settings.autoDetectLog && (
          <input
            type="text"
            value={settings.clientLogPath ?? ""}
            onChange={(e) => onUpdate({ clientLogPath: e.target.value || null })}
            placeholder="C:\\Program Files (x86)\\...\\logs\\Client.txt"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
          />
        )}
      </div>
    </div>
  );
}

function OverlayTab({ settings, onUpdate }: { settings: AppSettings; onUpdate: (p: Partial<AppSettings>) => Promise<void> }) {
  const overlay = settings.overlay;
  const updateOverlay = (partial: Partial<AppSettings["overlay"]>) =>
    onUpdate({ overlay: { ...overlay, ...partial } });

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <SectionLabel>Price check auto-dismiss (ms)</SectionLabel>
        <input
          type="number"
          value={overlay.fadeMs}
          onChange={(e) => updateOverlay({ fadeMs: parseInt(e.target.value) || 10000 })}
          min={1000}
          max={60000}
          step={1000}
          className="w-full px-3 py-2 rounded text-sm"
          style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
        />
      </div>

      <div>
        <SectionLabel>Toggle hotkey</SectionLabel>
        <input
          type="text"
          value={overlay.hotkey}
          onChange={(e) => updateOverlay({ hotkey: e.target.value })}
          className="w-full px-3 py-2 rounded text-sm"
          style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
        />
      </div>

      <div>
        <SectionLabel>Opacity</SectionLabel>
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={overlay.opacity}
          onChange={(e) => updateOverlay({ opacity: parseFloat(e.target.value) })}
          className="w-full"
        />
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{Math.round(overlay.opacity * 100)}%</span>
      </div>

      <div>
        <SectionLabel>Font size</SectionLabel>
        <select
          value={overlay.fontSize}
          onChange={(e) => updateOverlay({ fontSize: e.target.value as "small" | "medium" | "large" })}
          className="w-full px-3 py-2 rounded text-sm"
          style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  );
}

function BuildTab({ settings, onUpdate }: { settings: AppSettings; onUpdate: (p: Partial<AppSettings>) => Promise<void> }) {
  const build = settings.build;
  const updateBuild = (partial: Partial<BuildProfile>) =>
    onUpdate({ build: { ...build, ...partial } });

  const toggleTag = (list: string[], tag: string) =>
    list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];

  return (
    <div className="space-y-5 max-w-lg">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Configure your build archetype to personalize map mod danger warnings.
      </p>

      <div>
        <SectionLabel>Damage Types</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {DAMAGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => updateBuild({ damageTypes: toggleTag(build.damageTypes, opt) })}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                build.damageTypes.includes(opt) ? "font-bold" : "opacity-50 hover:opacity-75"
              }`}
              style={{
                backgroundColor: build.damageTypes.includes(opt) ? "var(--accent)" : "var(--bg-panel)",
                border: "1px solid var(--border-color)",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Defense Types</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {DEFENSE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => updateBuild({ defenseTypes: toggleTag(build.defenseTypes, opt) })}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                build.defenseTypes.includes(opt) ? "font-bold" : "opacity-50 hover:opacity-75"
              }`}
              style={{
                backgroundColor: build.defenseTypes.includes(opt) ? "var(--accent)" : "var(--bg-panel)",
                border: "1px solid var(--border-color)",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Recovery Types</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {RECOVERY_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => updateBuild({ recoveryTypes: toggleTag(build.recoveryTypes, opt) })}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                build.recoveryTypes.includes(opt) ? "font-bold" : "opacity-50 hover:opacity-75"
              }`}
              style={{
                backgroundColor: build.recoveryTypes.includes(opt) ? "var(--accent)" : "var(--bg-panel)",
                border: "1px solid var(--border-color)",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AiTab({ settings, onUpdate }: { settings: AppSettings; onUpdate: (p: Partial<AppSettings>) => Promise<void> }) {
  const ai = settings.ai;
  const updateAi = (partial: Partial<AiConfig>) =>
    onUpdate({ ai: { ...ai, ...partial } });

  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  // Load saved key on mount
  useEffect(() => {
    getApiKey().then((key) => {
      if (key) {
        setApiKey(key);
        setKeySaved(true);
      }
    });
  }, []);

  const saveKey = async () => {
    await saveApiKey(apiKey.trim());
    setKeySaved(true);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        AI features require a Claude API key. Your key is stored securely on your device and never sent anywhere except the Anthropic API.
      </p>

      <div>
        <SectionLabel>Claude API Key</SectionLabel>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setKeySaved(false); }}
            placeholder="sk-ant-..."
            className="flex-1 px-3 py-2 rounded text-sm"
            style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
          />
          <button
            onClick={saveKey}
            className="px-3 py-2 rounded text-sm font-bold transition-opacity hover:opacity-80"
            style={{
              background: keySaved ? "rgba(68,204,68,0.15)" : "rgba(255,255,255,0.08)",
              border: "1px solid var(--border-color)",
              color: keySaved ? "#44cc44" : "var(--text-primary)",
            }}
          >
            {keySaved ? "Saved" : "Save"}
          </button>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Get your key at console.anthropic.com
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={ai.enabled}
          onChange={(e) => updateAi({ enabled: e.target.checked })}
        />
        <span className="text-sm">Enable AI-assisted trading</span>
      </div>

      {ai.enabled && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ai.enableTradeAssistant}
              onChange={(e) => updateAi({ enableTradeAssistant: e.target.checked })}
            />
            <span className="text-sm">Trade whisper assistant</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ai.enableMarketTrends}
              onChange={(e) => updateAi({ enableMarketTrends: e.target.checked })}
            />
            <span className="text-sm">Market trend summaries</span>
          </div>
        </div>
      )}
    </div>
  );
}
