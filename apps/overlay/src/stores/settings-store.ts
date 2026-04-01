import { create } from "zustand";
import type { AppSettings, Game } from "@exiled-orb/shared";
import { DEFAULT_SETTINGS } from "@exiled-orb/shared";
import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:exiled-orb.db";

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setGame: (game: Game) => Promise<void>;
  setLeague: (league: string) => Promise<void>;
}

async function getDb() {
  return await Database.load(DB_URL);
}

async function readSettings(): Promise<AppSettings> {
  try {
    const db = await getDb();
    const rows = await db.select<{ key: string; value: string }[]>(
      "SELECT key, value FROM settings WHERE key = 'app_settings'"
    );
    if (rows.length > 0) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(rows[0].value) };
    }
  } catch (err) {
    console.error("[ExiledOrb] Failed to read settings:", err);
  }
  return { ...DEFAULT_SETTINGS };
}

async function writeSettings(settings: AppSettings): Promise<void> {
  try {
    const db = await getDb();
    const json = JSON.stringify(settings);
    await db.execute(
      "INSERT INTO settings (key, value, updated_at) VALUES ('app_settings', $1, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = unixepoch()",
      [json]
    );
  } catch (err) {
    console.error("[ExiledOrb] Failed to write settings:", err);
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  loadSettings: async () => {
    const settings = await readSettings();
    set({ settings, loaded: true });
  },

  updateSettings: async (partial) => {
    const merged = { ...get().settings, ...partial };
    set({ settings: merged });
    await writeSettings(merged);
  },

  setGame: async (game) => {
    await get().updateSettings({ game });
  },

  setLeague: async (league) => {
    await get().updateSettings({ league });
  },
}));
