import type { Game } from "../types/item.js";

/** Default PoE install paths on Windows for Client.txt */
export const CLIENT_LOG_PATHS: Record<Game, string[]> = {
  poe1: [
    "C:\\Program Files (x86)\\Grinding Gear Games\\Path of Exile\\logs\\Client.txt",
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Path of Exile\\logs\\Client.txt",
    "C:\\Program Files\\Grinding Gear Games\\Path of Exile\\logs\\Client.txt",
  ],
  poe2: [
    "C:\\Program Files (x86)\\Grinding Gear Games\\Path of Exile 2\\logs\\Client.txt",
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Path of Exile 2\\logs\\Client.txt",
    "C:\\Program Files\\Grinding Gear Games\\Path of Exile 2\\logs\\Client.txt",
  ],
};

/** GGG API endpoints */
export const GGG_API = {
  oauth: {
    authorize: "https://www.pathofexile.com/oauth/authorize",
    token: "https://www.pathofexile.com/oauth/token",
  },
  api: {
    poe1: "https://api.pathofexile.com",
    poe2: "https://api.pathofexile.com", // Same API, different endpoints
  },
  trade: {
    poe1: "https://www.pathofexile.com/api/trade",
    poe2: "https://www.pathofexile.com/api/trade2",
  },
  characterWindow: "https://www.pathofexile.com/character-window",
} as const;

/** poe.ninja URLs */
export const POE_NINJA = {
  poe1: "https://poe.ninja",
  poe2: "https://poe2.ninja",
} as const;

/** Overlay default settings */
export const OVERLAY_DEFAULTS = {
  priceCheckFadeMs: 10_000,
  clipboardPollMs: 200,
  toggleHotkey: "F5",
  overlayWidth: 400,
  overlayHeight: 600,
} as const;
