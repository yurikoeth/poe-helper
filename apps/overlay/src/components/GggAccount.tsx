import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useOverlayStore } from "../stores/overlay-store";
import { getStore, getApiKey } from "../utils/store";
import { useBuildStore, inferBuildTags, type BuildGoal } from "../stores/build-store";
import poe1Logo from "../assets/poe1-logo.png";
import poe2Logo from "../assets/poe2-logo.png";
import WitchSays from "./WitchSays";

interface GggCharacter {
  name: string;
  class: string;
  level: number;
  league: string | null;
  experience: number | null;
  game: string;
}

interface SocketInfo {
  color: string; // R, G, B, W, A
  group: number;
}

interface GggItem {
  name: string;
  base_type: string;
  inventory_id: string;
  icon: string;
  rarity: string;
  socket_count: number | null;
  max_links: number | null;
  socket_details: SocketInfo[];
  ilvl: number | null;
  corrupted: boolean;
  mods: string[];
}

interface BuildAnalysis {
  buildSummary: string;
  strengths: string[];
  weaknesses: string[];
  upgrades: Array<{
    slot: string;
    currentItem: string;
    suggestion: string;
    priority: string;
    estimatedCost: string;
  }>;
  overallRating: string;
  nextSteps: string;
}

/** Robust JSON parser for AI responses — handles code fences, trailing commas, truncation */
function parseAiJson<T>(raw: string, fallback: T): T {
  let text = raw;
  // Strip markdown code fences
  text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find the JSON object
  const start = text.indexOf("{");
  if (start < 0) {
    console.error("[ExiledOrb] No JSON object found in:", raw);
    return fallback;
  }
  text = text.substring(start);

  // The AI often truncates or puts literal \n inside strings.
  // Strategy: try parsing as-is, then progressively fix issues.

  // Attempt 1: direct parse
  try { return JSON.parse(text); } catch {}

  // Attempt 2: find last } and trim
  const end = text.lastIndexOf("}");
  if (end > 0) text = text.substring(0, end + 1);

  // Fix trailing commas
  text = text.replace(/,\s*([}\]])/g, "$1");

  try { return JSON.parse(text); } catch {}

  // Attempt 3: the response is often truncated mid-array.
  // Close any open arrays/objects to make it parseable.
  let fixed = text;
  // Count open/close braces and brackets
  let braces = 0, brackets = 0, inString = false, escape = false;
  for (const ch of fixed) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }
  // If we're inside a string, close it
  if (inString) fixed += '"';
  // Close open brackets and braces
  for (let i = 0; i < brackets; i++) fixed += ']';
  for (let i = 0; i < braces; i++) fixed += '}';
  // Fix trailing commas again after closing
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");

  try { return JSON.parse(fixed); } catch (e) {
    console.error("[ExiledOrb] JSON parse failed after all attempts:", e, "\nCleaned text:", fixed.substring(0, 500));
    return fallback;
  }
}

const STORE_KEY = "ggg_account_name";

const rarityColors: Record<string, string> = {
  Normal: "#c8c8c8",
  Magic: "#8888ff",
  Rare: "#ffff77",
  Unique: "#af6025",
  Gem: "#1ba29b",
  Currency: "#aa9e82",
};

const slotOrder = [
  "Helm", "Amulet", "Weapon", "Weapon2",
  "BodyArmour", "Offhand", "Offhand2",
  "Gloves", "Ring", "Ring2", "Belt", "Boots",
  "Flask",
];

const slotLabels: Record<string, string> = {
  Helm: "Helmet", Amulet: "Amulet", Weapon: "Weapon", Weapon2: "Swap Weapon",
  BodyArmour: "Body", Offhand: "Off-hand", Offhand2: "Swap Off-hand",
  Gloves: "Gloves", Ring: "Ring 1", Ring2: "Ring 2", Belt: "Belt", Boots: "Boots",
  Flask: "Flask",
};

export default function GggAccount() {
  const [accountName, setAccountName] = useState("");
  const [savedAccount, setSavedAccount] = useState<string | null>(null);
  const [characters, setCharacters] = useState<GggCharacter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChar, setExpandedChar] = useState<string | null>(null);
  const [charItems, setCharItems] = useState<Record<string, GggItem[]>>({});
  const [itemsLoading, setItemsLoading] = useState<string | null>(null);
  const [buildAnalysis, setBuildAnalysis] = useState<Record<string, BuildAnalysis>>({});
  const [analyzingBuild, setAnalyzingBuild] = useState<string | null>(null);

  useEffect(() => {
    getStore().then((store) => {
      store.get<string>(STORE_KEY).then((name) => {
        if (name) {
          setSavedAccount(name);
          setAccountName(name);
          loadCharacters(name);
        }
      });
    }).catch(() => {});
  }, []);

  const loadCharacters = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const chars = await invoke<GggCharacter[]>("fetch_characters", { accountName: name });
      setCharacters(chars);
    } catch (err) {
      setError(String(err));
      setCharacters([]);
    }
    setLoading(false);
  };

  const loadItems = async (charName: string, force = false) => {
    if (charItems[charName] && !force) return; // already loaded
    setItemsLoading(charName);
    try {
      console.log("[ExiledOrb] Fetching items for", charName, "account:", savedAccount);
      const items = await invoke<GggItem[]>("fetch_character_items", {
        accountName: savedAccount,
        character: charName,
      });
      console.log("[ExiledOrb] Got", items.length, "items for", charName);
      setCharItems((prev) => ({ ...prev, [charName]: items }));
    } catch (err) {
      console.error("[ExiledOrb] loadItems failed:", err);
      setError(`Failed to load gear: ${err}`);
    }
    setItemsLoading(null);
  };

  const toggleChar = (name: string) => {
    if (expandedChar === name) {
      setExpandedChar(null);
    } else {
      setExpandedChar(name);
      loadItems(name);
    }
  };

  const activeBuildName = useBuildStore((s) => s.activeBuild?.characterName);

  const setAsActiveBuild = async (char: GggCharacter) => {
    // Load items if not loaded
    if (!charItems[char.name]) await loadItems(char.name);
    const items = charItems[char.name] || [];

    // Infer build tags from all gear mods
    const allMods = items.flatMap((i) => i.mods);
    const tags = inferBuildTags(allMods);

    const gearSummary = items
      .map((i) => `[${i.inventory_id}] ${i.name || i.base_type} (${i.rarity})`)
      .join("\n");

    await useBuildStore.getState().setActiveBuild({
      characterName: char.name,
      characterClass: char.class,
      level: char.level,
      game: char.game as "poe1" | "poe2",
      league: char.league || "Standard",
      damageTypes: tags.damageTypes,
      defenseTypes: tags.defenseTypes,
      recoveryTypes: tags.recoveryTypes,
      mainSkill: tags.mainSkill,
      keyItems: items.filter((i) => i.rarity === "Unique").map((i) => i.name || i.base_type),
      gearSummary,
      goal: useBuildStore.getState().activeBuild?.characterName === char.name
        ? useBuildStore.getState().activeBuild?.goal ?? null
        : null,
      updatedAt: Date.now(),
    });

    // Also update overlay store
    useOverlayStore.getState().setCharacterClass(char.class);
    useOverlayStore.getState().setCharacterName(char.name);
  };

  const analyzeBuild = async (char: GggCharacter) => {
    setError(null);

    // Need items loaded first
    if (!charItems[char.name]) await loadItems(char.name);
    const items = charItems[char.name];
    if (!items || items.length === 0) {
      setError("No gear loaded for this character. Try Refresh Gear first.");
      return;
    }

    const apiKey = await getApiKey();

    if (!apiKey) {
      setError("Add your Claude API key in Settings > AI to use build analysis. Get one at console.anthropic.com — gear viewing and price checks work without it.");
      return;
    }

    setAnalyzingBuild(char.name);
    console.log("[ExiledOrb] Starting build analysis for", char.name, "with", items.length, "items");
    try {
      const buildGoal = useBuildStore.getState().savedBuilds.find((b) => b.characterName === char.name)?.goal;
      const charJson = JSON.stringify({
        name: char.name, class: char.class, level: char.level, league: char.league, game: char.game,
        buildGoal: buildGoal ? {
          buildName: buildGoal.buildName,
          focus: buildGoal.focus,
          budget: buildGoal.budget,
          notes: buildGoal.notes,
        } : null,
      });
      const itemsJson = JSON.stringify(items.map((i) => ({
        slot: i.inventory_id,
        name: i.name || i.base_type,
        baseType: i.base_type,
        rarity: i.rarity,
        ilvl: i.ilvl,
        links: i.max_links,
        corrupted: i.corrupted,
        mods: i.mods,
      })));

      let result: string;
      try {
        result = await invoke("analyze_build", { apiKey, characterJson: charJson, itemsJson });
      } catch (invokeErr) {
        console.error("[ExiledOrb] invoke failed:", invokeErr);
        setError(`AI call failed: ${invokeErr}`);
        setAnalyzingBuild(null);
        return;
      }
      console.log("[ExiledOrb] Raw AI response:", result.substring(0, 300));
      const analysis = parseAiJson<BuildAnalysis>(result, {
        buildSummary: "The Witch could not read this exile's fate. Try again.",
        strengths: [], weaknesses: [], upgrades: [],
        overallRating: "?", nextSteps: "Click Analyze Build to retry.",
      });
      setBuildAnalysis((prev) => ({ ...prev, [char.name]: analysis }));
    } catch (err) {
      setError(String(err));
    }
    setAnalyzingBuild(null);
  };

  const connect = async () => {
    const name = accountName.trim();
    if (!name) { setError("Enter your PoE account name"); return; }
    try {
      const store = await getStore();
      await store.set(STORE_KEY, name);
      await store.save();
    } catch {}
    setSavedAccount(name);
    await loadCharacters(name);
  };

  const disconnect = async () => {
    setSavedAccount(null);
    setCharacters([]);
    setCharItems({});
    setAccountName("");
    try {
      const store = await getStore();
      await store.delete(STORE_KEY);
      await store.save();
    } catch {}
  };

  // Match active character from Client.txt
  const activeCharName = useOverlayStore((s) => s.characterName);
  useEffect(() => {
    if (characters.length > 0 && activeCharName) {
      const match = characters.find((c) => c.name.toLowerCase() === activeCharName.toLowerCase());
      if (match) {
        useOverlayStore.getState().setCharacterClass(match.class);
      }
    }
  }, [characters, activeCharName]);

  if (!savedAccount) {
    return (
      <div
        className="rounded border px-3 py-3 space-y-2"
        style={{
          background: "linear-gradient(180deg, rgba(24,24,28,0.95) 0%, rgba(14,14,18,0.95) 100%)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
          PoE Account
        </div>
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Enter your account name to load characters. Your profile must be public.
        </div>
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="Account name"
          className="w-full px-2 py-1.5 rounded text-xs"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
          }}
        />
        {error && <div className="text-xs text-red-400">{error}</div>}
        <button
          onClick={connect}
          disabled={loading}
          className="w-full py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-gold)", color: "var(--accent)" }}
        >
          {loading ? "Loading..." : "Load Characters"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Account header */}
      <div
        className="rounded border px-3 py-2"
        style={{
          background: "linear-gradient(180deg, rgba(24,24,28,0.95) 0%, rgba(14,14,18,0.95) 100%)",
          borderColor: "var(--border-gold)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold" style={{ color: "var(--accent)" }}>{savedAccount}</div>
          <div className="flex gap-1">
            <button onClick={() => loadCharacters(savedAccount)} className="text-xs px-1.5 py-0.5 rounded hover:opacity-80" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }} title="Refresh">↻</button>
            <button onClick={disconnect} className="text-xs px-1.5 py-0.5 rounded hover:opacity-80" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }} title="Disconnect">✕</button>
          </div>
        </div>
      </div>

      {/* API Key inline setup */}
      <ApiKeyInline />

      {loading && <div className="text-xs text-center py-2" style={{ color: "var(--text-secondary)" }}>Loading...</div>}
      {error && <div className="text-xs text-red-400 px-2">{error}</div>}

      {/* Character list */}
      {characters.map((char, idx) => (
        <div key={`${char.name}-${char.game}-${idx}`}>
          {/* Character header — clickable */}
          <div
            className="rounded border px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity"
            style={{
              background: expandedChar === char.name
                ? "linear-gradient(180deg, rgba(30,30,36,0.95) 0%, rgba(18,18,22,0.95) 100%)"
                : "linear-gradient(180deg, rgba(24,24,28,0.9) 0%, rgba(14,14,18,0.9) 100%)",
              borderColor: expandedChar === char.name ? "var(--border-gold)" : "var(--border-color)",
            }}
            onClick={() => toggleChar(char.name)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={char.game === "poe2" ? poe2Logo : poe1Logo} alt={char.game} className="h-3.5 shrink-0" style={{ opacity: 0.7 }} />
                <div>
                  <span className="text-xs font-bold" style={{ color: activeCharName?.toLowerCase() === char.name.toLowerCase() ? "var(--accent)" : "var(--text-primary)" }}>
                    {char.name}
                  </span>
                  <span className="text-xs ml-1.5" style={{ color: "var(--text-secondary)" }}>
                    Lv.{char.level} {char.class}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {char.league && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", fontSize: "0.6rem" }}>
                    {char.league}
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {expandedChar === char.name ? "▲" : "▼"}
                </span>
              </div>
            </div>
          </div>

          {/* Expanded gear view */}
          {expandedChar === char.name && (
            <div className="mt-1 space-y-1">
              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setAsActiveBuild(char); }}
                  className="flex-1 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80"
                  style={{
                    background: activeBuildName === char.name ? "rgba(68,204,68,0.15)" : "rgba(255,255,255,0.06)",
                    border: activeBuildName === char.name ? "1px solid #44cc44" : "1px solid var(--border-color)",
                    color: activeBuildName === char.name ? "#44cc44" : "var(--text-secondary)",
                  }}
                >
                  {activeBuildName === char.name ? "Active" : "Set Active"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); loadItems(char.name, true); }}
                  className="py-1.5 px-2 rounded text-xs transition-opacity hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
                >
                  ↻
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); analyzeBuild(char); }}
                  disabled={analyzingBuild === char.name}
                  className="flex-1 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-gold)", color: "var(--accent)" }}
                >
                  {analyzingBuild === char.name ? "Analyzing..." : "Analyze"}
                </button>
              </div>

              {/* Build Goal editor */}
              <BuildGoalEditor characterName={char.name} />

              {/* Build Analysis results */}
              {buildAnalysis[char.name] && (
                <BuildAnalysisCard
                  analysis={buildAnalysis[char.name]}
                  onClose={() => setBuildAnalysis((prev) => { const copy = { ...prev }; delete copy[char.name]; return copy; })}
                />
              )}

              {/* Gear list */}
              {itemsLoading === char.name ? (
                <div className="text-xs text-center py-2" style={{ color: "var(--text-secondary)" }}>Loading gear...</div>
              ) : (
                <div className="space-y-0.5">
                  {charItems[char.name]
                    ?.sort((a, b) => {
                      const ai = slotOrder.indexOf(a.inventory_id);
                      const bi = slotOrder.indexOf(b.inventory_id);
                      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                    })
                    .map((item, i) => (
                      <ItemCard key={i} item={item} />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ApiKeyInline() {
  const [show, setShow] = useState(false);
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getStore().then((store) => {
      store.get<string>("claude_api_key").then((k) => {
        if (k) { setKey(k); setSaved(true); }
      });
    }).catch(() => {});
  }, []);

  const save = async () => {
    const store = await getStore();
    await store.set("claude_api_key", key.trim());
    await store.save();
    setSaved(true);
  };

  return (
    <div
      className="rounded border px-3 py-1.5"
      style={{ background: "rgba(18,18,22,0.9)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: saved ? "#44cc44" : "var(--text-secondary)" }}>
            {saved ? "API Key Set" : "Claude API Key"}
          </span>
        </div>
        <button
          onClick={() => setShow(!show)}
          className="text-xs px-1.5 py-0.5 rounded hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
        >
          {show ? "Hide" : "Edit"}
        </button>
      </div>
      {show && (
        <div className="flex gap-1.5 mt-1.5">
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false); }}
            placeholder="sk-ant-..."
            className="flex-1 px-2 py-1 rounded text-xs"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
          />
          <button
            onClick={save}
            className="px-2 py-1 rounded text-xs hover:opacity-80"
            style={{ background: saved ? "rgba(68,204,68,0.15)" : "rgba(255,255,255,0.08)", border: "1px solid var(--border-color)", color: saved ? "#44cc44" : "var(--text-primary)" }}
          >
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

const FOCUS_OPTIONS = ["DPS", "Survivability", "Boss Killing", "Clear Speed", "Magic Find", "League Start", "Budget", "Min-Max"];

function BuildGoalEditor({ characterName }: { characterName: string }) {
  const savedBuild = useBuildStore((s) => s.savedBuilds.find((b) => b.characterName === characterName));
  const goal = savedBuild?.goal;
  const [expanded, setExpanded] = useState(false);
  const [buildName, setBuildName] = useState(goal?.buildName ?? "");
  const [focus, setFocus] = useState<string[]>(goal?.focus ?? []);
  const [budget, setBudget] = useState(goal?.budget ?? "");
  const [notes, setNotes] = useState(goal?.notes ?? "");

  const save = () => {
    useBuildStore.getState().setGoal(characterName, { buildName, focus, budget, notes });
    setExpanded(false);
  };

  const toggleFocus = (f: string) =>
    setFocus((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  return (
    <div
      className="rounded border px-2 py-1.5"
      style={{
        background: "rgba(18,18,22,0.9)",
        borderColor: goal ? "var(--border-gold)" : "var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="text-xs" style={{ color: goal ? "var(--accent)" : "var(--text-secondary)" }}>
          {goal ? `Build: ${goal.buildName}` : "Set Build Goal"}
          {goal && goal.focus.length > 0 && (
            <span style={{ color: "var(--text-secondary)" }}> — {goal.focus.join(", ")}</span>
          )}
        </div>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Build Name</div>
            <input
              type="text"
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              placeholder="e.g. RF Juggernaut, Lightning Arrow Deadeye"
              className="w-full px-2 py-1 rounded text-xs"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Focus</div>
            <div className="flex flex-wrap gap-1">
              {FOCUS_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => toggleFocus(f)}
                  className="px-1.5 py-0.5 rounded text-xs transition-colors"
                  style={{
                    background: focus.includes(f) ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: focus.includes(f) ? "1px solid var(--border-gold)" : "1px solid var(--border-color)",
                    color: focus.includes(f) ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Budget</div>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 50 divine, 2000 chaos, unlimited"
              className="w-full px-2 py-1 rounded text-xs"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Notes</div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. need more chaos res, want to do ubers"
              className="w-full px-2 py-1 rounded text-xs"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
          </div>

          <button
            onClick={save}
            className="w-full py-1.5 rounded text-xs font-bold uppercase tracking-wide hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-gold)", color: "var(--accent)" }}
          >
            Save Goal
          </button>
        </div>
      )}
    </div>
  );
}

const priorityColors: Record<string, string> = {
  high: "#ff4444",
  medium: "#ffaa00",
  low: "#44cc44",
};

function BuildAnalysisCard({ analysis, onClose }: { analysis: BuildAnalysis; onClose: () => void }) {
  return (
    <div className="relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-20 text-xs px-1.5 py-0.5 rounded hover:opacity-80"
        style={{ background: "rgba(0,0,0,0.5)", color: "var(--text-secondary)" }}
      >
        ✕
      </button>
      <WitchSays title={`Build Analysis — ${analysis.overallRating}/10`}>
        <div className="space-y-2">

      <div className="text-xs" style={{ color: "var(--text-primary)" }}>
        {analysis.buildSummary}
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div>
          <div className="text-xs font-bold" style={{ color: "#44cc44" }}>Strengths</div>
          {analysis.strengths.map((s, i) => (
            <div key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>+ {s}</div>
          ))}
        </div>
      )}

      {/* Weaknesses */}
      {analysis.weaknesses.length > 0 && (
        <div>
          <div className="text-xs font-bold" style={{ color: "#ff4444" }}>Weaknesses</div>
          {analysis.weaknesses.map((w, i) => (
            <div key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>- {w}</div>
          ))}
        </div>
      )}

      {/* Upgrade suggestions */}
      {analysis.upgrades.length > 0 && (
        <div>
          <div className="text-xs font-bold" style={{ color: "var(--accent)" }}>Suggested Upgrades</div>
          {analysis.upgrades.map((u, i) => (
            <div key={i} className="text-xs mt-1 pl-2 border-l-2" style={{ borderColor: priorityColors[u.priority] || "#888" }}>
              <div style={{ color: "var(--text-primary)" }}>
                <span className="font-bold">{u.slot}</span>
                {u.currentItem && <span style={{ color: "var(--text-secondary)" }}> ({u.currentItem})</span>}
              </div>
              <div style={{ color: "var(--text-secondary)" }}>{u.suggestion}</div>
              {u.estimatedCost && (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.65rem" }}>~{u.estimatedCost}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Next steps */}
      <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="text-xs font-bold" style={{ color: "var(--accent)" }}>Next Steps</div>
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{analysis.nextSteps}</div>
      </div>

        </div>
      </WitchSays>
    </div>
  );
}

const socketColors: Record<string, string> = {
  R: "#e44", G: "#4b4", B: "#66f", W: "#ddd", A: "#888",
};

function SocketDisplay({ sockets }: { sockets: SocketInfo[] }) {
  if (sockets.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      {sockets.map((s, i) => {
        const linked = i > 0 && sockets[i - 1].group === s.group;
        return (
          <div key={i} className="flex items-center">
            {linked && (
              <div className="w-1.5 h-0.5" style={{ background: "rgba(255,255,255,0.3)" }} />
            )}
            <div
              className="w-3 h-3 rounded-sm border"
              style={{
                background: socketColors[s.color] || "#888",
                borderColor: "rgba(0,0,0,0.4)",
                opacity: 0.85,
              }}
              title={`${s.color === "R" ? "Red" : s.color === "G" ? "Green" : s.color === "B" ? "Blue" : "White"} socket`}
            />
          </div>
        );
      })}
    </div>
  );
}

function ItemCard({ item }: { item: GggItem }) {
  const [showMods, setShowMods] = useState(false);
  const displayName = item.name || item.base_type;
  const subtitle = item.name ? item.base_type : null;
  const color = rarityColors[item.rarity] || "#c8c8c8";
  const slotLabel = slotLabels[item.inventory_id] || item.inventory_id;

  return (
    <div
      className="rounded border px-2 py-1.5 cursor-pointer hover:opacity-90"
      style={{
        background: "rgba(18,18,22,0.9)",
        borderColor: "rgba(255,255,255,0.05)",
        borderLeft: `2px solid ${color}`,
      }}
      onClick={() => item.mods.length > 0 && setShowMods(!showMods)}
    >
      <div className="flex items-center gap-2">
        {/* Item icon */}
        {item.icon && (
          <img src={item.icon} alt="" className="w-6 h-6 shrink-0 object-contain" style={{ imageRendering: "pixelated" }} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-xs font-bold truncate block" style={{ color }}>
                {displayName}
              </span>
              {subtitle && (
                <span className="text-xs truncate block" style={{ color: "var(--text-secondary)" }}>
                  {subtitle}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              {item.corrupted && (
                <span className="text-xs px-1 rounded" style={{ background: "rgba(255,68,68,0.15)", color: "#ff4444", fontSize: "0.55rem" }}>Corrupted</span>
              )}
              <span className="text-xs" style={{ color: "var(--text-secondary)", fontSize: "0.6rem" }}>
                {slotLabel}
              </span>
            </div>
          </div>

          {/* Socket display */}
          {item.socket_details.length > 0 && (
            <SocketDisplay sockets={item.socket_details} />
          )}
        </div>
      </div>

      {/* Expanded mods */}
      {showMods && item.mods.length > 0 && (
        <div className="mt-1 pt-1 border-t space-y-0.5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {item.mods.map((mod, i) => (
            <div key={i} className="text-xs" style={{ color: "#8888cc" }}>
              {mod}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
