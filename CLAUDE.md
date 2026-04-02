# ExiledOrb

All-in-one Path of Exile companion — desktop overlay for PoE1 & PoE2.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Overlay**: Tauri v2 (Rust backend + React 19 frontend)
- **Shared**: TypeScript library — item/log parsers, API clients, types, game data
- **State**: Zustand — one store per feature domain
- **Styling**: Tailwind CSS v4
- **DB**: SQLite via tauri-plugin-sql (local)
- **AI**: Claude API via Rust reqwest + rustls-tls. User's own key in tauri-plugin-store. All responses in PoE1 Witch persona.
- **Testing**: Vitest

## Project Layout

```
poe-helper/
├── packages/shared/src/
│   ├── types/          # Item, Character, Currency, Map, Session, Settings, Speedrun, AI, Flipping
│   ├── parsers/        # item-parser.ts (clipboard), client-log.ts (Client.txt)
│   ├── api/            # poe-ninja.ts, ggg-trade.ts, rate-limiter.ts
│   ├── data/           # dangerous-mods, stat-mappings, map-data, hideout-names,
│   │                   # leveling-guide, atlas-strategies, mod-tiers
│   └── utils/          # format.ts, constants.ts
├── apps/overlay/
│   ├── src-tauri/
│   │   ├── .cargo/config.toml   # target-dir = "E:\\rust-target" (avoids C: disk space issues)
│   │   ├── capabilities/        # Tauri v2 permissions (MUST include core:event:allow-listen)
│   │   └── src/                 # ai.rs, clipboard.rs, log_watcher.rs, oauth.rs, settings.rs, lib.rs
│   └── src/
│       ├── hooks/       # useClipboard, useClientLog, usePriceCheck, useMapSpeedrun,
│       │                # useAiAnalysis, useTradeWhispers, useLevelingTracker, useFlipTracker
│       ├── components/  # PriceCheck, ZoneTracker, GggAccount, AskAi, MarketTab,
│       │                # LevelingGuide, FlipTracker, AtlasHelper, MapTimer, Settings,
│       │                # WitchSays, AiPriceInsight, TradeAssistant, SpeedrunStats
│       ├── stores/      # overlay-store, settings-store, speedrun-store, ai-store, build-store
│       ├── utils/       # store.ts (shared tauri-plugin-store access)
│       └── assets/      # classes/, menu/, poe1/poe2 logos, wallpaper
└── run.bat              # Launch script
```

## Commands

```bash
pnpm install                     # Install all deps
pnpm run dev:overlay             # Start overlay (Tauri dev)
pnpm run build                   # Build all packages
pnpm run test                    # Run all tests
pnpm run typecheck               # TS check all packages

# From apps/overlay/:
pnpm tauri dev                   # Dev overlay with hot reload
pnpm tauri build                 # Production .msi/.exe

# Shared package tsbuildinfo cache issue:
#   rm -f packages/shared/tsconfig.tsbuildinfo && pnpm run --filter @exiled-orb/shared build

# Launch: Double-click run.bat or Desktop/ExiledOrb.bat
```

## Critical: Things That Break and How to Fix Them

### Tauri v2 Permissions (capabilities/default.json)
**Every** frontend `listen()` and `emit()` call requires `core:event:allow-listen` and `core:event:allow-emit` in the capabilities file. Without these, clipboard detection and log events silently fail with NO error. If events stop working, check capabilities first.

### Clipboard (Win32 API, not arboard)
Clipboard uses **direct Win32 API** calls (`OpenClipboard`/`GetClipboardData`/`CloseClipboard`) in `clipboard.rs`. The `arboard` crate was removed because it fails on every read when PoE or other apps hold the clipboard. Do NOT switch back to arboard.

### Rust HTTP (reqwest + rustls-tls)
reqwest uses `rustls-tls` (NOT native-tls). Native TLS on Windows fails to connect to api.anthropic.com. The Cargo.toml must have:
```toml
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
```

### Disk Space
Rust debug builds consume ~6-7GB. Build target is on **E: drive** via `src-tauri/.cargo/config.toml`:
```toml
[build]
target-dir = "E:\\rust-target"
```
If C: runs out of space, `cargo clean` only helps if target is still on C:. Check config.toml first.

### Rust Rebuilds During Dev
Tauri's file watcher triggers Rust rebuilds when `src-tauri/` files change. If it double-rebuilds and runs out of space, kill the process and restart manually. Only the overlay crate recompiles (~8-20s), not all 500+ deps.

## Architecture

### Clipboard → Price Check
```
Ctrl+C in PoE → Win32 clipboard API (polls 200ms)
  → detects "Item Class:" or "Rarity:" + "--------"
  → Tauri "clipboard-item" event → useClipboard hook
  → item-parser.ts → ParsedItem
  → usePriceCheck: poe.ninja lookup via fetch_ninja Rust proxy
  → For rares: mod-tiers.ts evaluates mods (T1-T5, roll %, combos)
  → PriceCheck.tsx renders tier bars, price, verdict
  → [if AI key set] useAiAnalysis → ai.rs → Claude (Witch persona)
```

### Client.txt → Zone/Death Tracking
```
PoE writes Client.txt → log_watcher.rs (polls 500ms, tail-only)
  → parse_log_line: zone/death/whisper/level_up/connected/area_level
  → Tauri "log-event" event → useClientLog hook
  → Startup: scans last 64KB for char name, zone, area level
  → Stores in Tauri managed state (GameState) → get_initial_game_state IPC
```

### Characters + AI Build Analysis
```
GGG public API → fetch_characters (PoE1 + PoE2, deduped by name)
  → fetch_character_items → gear with sockets/links
  → Analyze Build → ai.rs (Sonnet, 4096 tokens, Witch persona)
  → parseAiJson handles malformed JSON (code fences, truncation, trailing commas)
```

### Navigation
```
Home: ZoneTracker header + menu grid (7 pages)
  Market | Leveling | Atlas | Maps | Flips | Ask AI | Characters
Esc → back to home
```

## Key Design Decisions

- **Win32 clipboard (not arboard)**: Direct API is reliable when games hold the clipboard open.
- **Client.txt polling (not notify)**: 500ms poll — notify crate unreliable on non-C: drives.
- **poe.ninja via Rust proxy**: Avoids CORS. All ninja calls go through `fetch_ninja` command.
- **rustls-tls (not native-tls)**: Windows native TLS can't reach Claude API reliably.
- **Game-agnostic**: `game: 'poe1' | 'poe2'` throughout all types, parsers, APIs, data.
- **Witch AI Persona**: WITCH_PERSONA constant in ai.rs, injected into all Claude system prompts.
- **Mod Tier Evaluation**: Local mod-tiers.ts with T1-T5 ranges for 30+ mods. No API needed.
- **Build Store**: Per-character build profiles with goals. Fed as context to all AI features.
- **Timeouts**: 60s for Claude API, 10s for poe.ninja. Prevents hanging requests.

## Conventions

- TypeScript strict mode, package scope `@exiled-orb/*`
- Shared subpath exports: `@exiled-orb/shared/types`, `/parsers`, `/api`, `/data`
- Rust snake_case, Tauri auto-converts to camelCase for JS invoke params
- Rust return types (structs) serialize as snake_case — TS interfaces must match
- Prices in chaos orbs, divine conversion via live poe.ninja rate (getDivineRateCached)
- One Zustand store per domain (overlay, settings, speedrun, ai, build)
- AI: Haiku for fast, Sonnet for deep analysis. All wrapped in WitchSays component.
- Console logs prefixed with `[ExiledOrb]`, Rust stderr with `[ExiledOrb]`

## PoE-Specific

- **Client.txt path**: `E:\SteamLibrary\steamapps\common\Path of Exile\logs\Client.txt`
- **Auto-detect**: Checks C:\, D:\, E:\, F:\ SteamLibrary paths + GGG standalone
- **Current league**: Mirage (hardcoded in DEFAULT_SETTINGS + usePriceCheck fallback)
- **User's account**: yurikoeth#5030, active character: witchtimee (Elementalist, PoE1)
- **Item text format**: Sections split by "--------", starts with "Item Class:" (PoE2) or "Rarity:" (PoE1)

## Not Yet Implemented

- GGG OAuth2 flow (stash tabs, private profiles)
- Tauri Windows packaging/installer (.msi/.exe)
- Snipe alerts (background trade polling)
- GGG Trade API for rare pricing (currently mod-tier estimation only)
