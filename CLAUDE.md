# ExiledOrb

All-in-one Path of Exile companion — desktop overlay + web dashboard for PoE1 & PoE2.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Overlay**: Tauri v2 (Rust backend + React 19 frontend), transparent always-on-top window
- **Web**: React 19 + Vite, deployed to Vercel with serverless API routes
- **Shared**: TypeScript library with item/log parsers, API clients, type definitions, game data
- **State**: Zustand (both overlay and web) — dedicated stores per feature
- **Styling**: Tailwind CSS v4
- **DB**: SQLite via tauri-plugin-sql (overlay local), Supabase (web cloud)
- **AI**: Claude API via Rust reqwest (user's own key, stored in tauri-plugin-store). All AI responses are in the Witch persona from PoE1.
- **Testing**: Vitest

## Project Layout

```
exiled-orb/
├── packages/shared/src/
│   ├── types/                   # Item, Character, Currency, Map, Session, Settings, Speedrun, AI, Flipping
│   ├── parsers/                 # item-parser.ts (clipboard), client-log.ts (Client.txt)
│   ├── api/                     # poe-ninja.ts, ggg-trade.ts (with stat mappings), rate-limiter.ts
│   ├── data/                    # dangerous-mods.ts, stat-mappings.ts, map-data.ts, hideout-names.ts,
│   │                            # leveling-guide.ts, atlas-strategies.ts, mod-tiers.ts
│   └── utils/                   # format.ts, constants.ts
├── apps/overlay/
│   ├── src-tauri/src/           # Rust: ai.rs, clipboard.rs, log_watcher.rs, oauth.rs, settings.rs, lib.rs
│   └── src/
│       ├── hooks/               # useClipboard, useClientLog, usePriceCheck, useMapSpeedrun,
│       │                        # useAiAnalysis, useTradeWhispers, useLevelingTracker, useFlipTracker
│       ├── components/          # PriceCheck (with mod tier eval), MapModWarnings, ZoneTracker,
│       │                        # MapTimer, SpeedrunStats, MapSplitDisplay, AiPriceInsight,
│       │                        # TradeAssistant, LevelingGuide, FlipTracker, AtlasHelper,
│       │                        # Settings, GggAccount (gear viewer + AI build analyzer),
│       │                        # AskAi (chat with image support + saved chats), MarketTab,
│       │                        # WitchSays (Witch persona wrapper)
│       ├── stores/              # overlay-store.ts, settings-store.ts, speedrun-store.ts, ai-store.ts, build-store.ts
│       ├── utils/               # store.ts (shared tauri-plugin-store access)
│       └── assets/              # classes/ (character art), menu/ (item art), poe1/poe2 logos, wallpaper
├── apps/web/
│   └── src/pages/               # Dashboard.tsx, Characters.tsx
├── run.bat                      # Launch script
```

## Commands

```bash
pnpm install                     # Install all dependencies
pnpm run dev:overlay             # Start overlay (Tauri dev mode)
pnpm run dev:web                 # Start web dashboard
pnpm run build                   # Build all packages
pnpm run test                    # Run all tests (vitest)
pnpm run typecheck               # TypeScript check all packages

# Tauri-specific (from apps/overlay/)
pnpm tauri dev                   # Dev overlay with hot reload
pnpm tauri build                 # Production Windows build (.msi/.exe)

# Shared package (from packages/shared/)
pnpm run build                   # Compile TS → dist/
pnpm run test                    # Run parser + API tests

# IMPORTANT: shared package uses composite tsc. If `pnpm run build` produces
# no output, delete tsconfig.tsbuildinfo first:
#   rm -f packages/shared/tsconfig.tsbuildinfo && pnpm run --filter @exiled-orb/shared build

# Launch shortcut:
#   Double-click run.bat or Desktop/ExiledOrb.bat
```

## Architecture

### Data Flow: Price Check + Mod Tier Evaluation
```
Ctrl+C in PoE → OS clipboard
  → Rust clipboard.rs (polls 200ms, detects "Item Class:"/"Rarity:" pattern)
  → Tauri "clipboard-item" event → useClipboard hook
  → item-parser.ts → structured ParsedItem
  → usePriceCheck: poe.ninja lookup via Rust fetch_ninja proxy (avoids CORS)
  → For rares: mod-tiers.ts evaluates each mod (T1-T5, roll ranges, roll %)
  → Computes score (0-100), verdict (GODLY/GREAT/GOOD/DECENT/VENDOR)
  → Estimates price from mod tiers if no poe.ninja match
  → PriceCheck.tsx shows tier bars, roll ranges, combos, price
  → [if AI enabled] useAiAnalysis → ai.rs → Claude API (Witch persona)
```

### Data Flow: Client.txt Monitoring (Polling)
```
PoE writes Client.txt → Rust log_watcher.rs (polls every 500ms, tail-only)
  → parse_log_line: zone/death/whisper/level_up/connected/area_level
  → Tauri "log-event" event → useClientLog hook
  → On startup: scans last 64KB for character name, zone, area level
  → Stores in Tauri managed state → frontend fetches via get_initial_game_state
  → Game detected from Client.txt path (PoE1 vs PoE2)
```

### Data Flow: Character Data (Public API)
```
User enters GGG account name → Rust fetch_characters (both PoE1 + PoE2 realms)
  → Deduplicates by name, sorts by level
  → Click character → fetch_character_items → shows gear with socket colors + links
  → Set Build Goal (name, focus tags, budget, notes)
  → Set as Active Build → infers damage/defense/recovery tags from gear mods
  → Active build context fed to all AI features
  → Analyze Build → ai.rs (Witch persona, 4096 tokens) → mod ratings, upgrade suggestions
```

### Data Flow: Ask AI (with Vision)
```
User types question (+ optional pasted/dropped image)
  → Active build context auto-appended
  → ask_poe_question or ask_poe_with_image → Claude API (Witch persona)
  → Response displayed in WitchSays component (Witch portrait)
  → Chats auto-saved, browsable history, up to 20 saved
```

### Navigation
```
Home screen: ZoneTracker header (click to go home) + menu grid
  → Market (poe.ninja prices via Rust proxy)
  → Leveling (PoE1 10 acts / PoE2 6 acts, per-character checklists)
  → Atlas (curated farming strategies)
  → Maps (speedrun timer, maps/hr)
  → Flips (currency trade profit tracker)
  → Ask AI (chat with Witch, image support, saved chats)
  → Characters (gear viewer, build goals, AI analysis)
Esc → back to home
```

## Key Design Decisions

- **Clipboard polling (not hotkey interception)**: Same approach as GGG-sanctioned tools. Safe from anti-cheat.
- **Client.txt polling (not notify)**: 500ms poll loop instead of notify crate — reliable across all drives on Windows.
- **poe.ninja via Rust proxy**: All poe.ninja calls go through Rust fetch_ninja command to avoid CORS.
- **Game-agnostic via `game: 'poe1' | 'poe2'`**: All types, parsers, APIs, and data support both games.
- **Witch AI Persona**: All Claude API responses are in-character as the PoE1 Witch (darkly sardonic, vengeful, knowledgeable). Defined in WITCH_PERSONA constant in ai.rs.
- **Mod Tier Evaluation**: Local mod-tiers.ts database with T1-T5 ranges + max rolls for 30+ common mods. Computes roll quality %, combo detection, and price estimation without API calls.
- **Build Store**: Per-character build profiles with goals (name, focus tags, budget, notes). Fed as context to all AI features.
- **Shared store utility**: Single getStore()/getApiKey()/saveApiKey() in utils/store.ts — eliminates duplicate Store.load() calls.
- **Dedicated Zustand stores**: overlay-store, settings-store, speedrun-store, ai-store, build-store.

## PoE-Specific Knowledge

- **Client.txt path (this user)**: `E:\SteamLibrary\steamapps\common\Path of Exile\logs\Client.txt`
- **Auto-detect paths**: Checks C:\, D:\, E:\, F:\ SteamLibrary paths + GGG standalone paths
- **Current league**: Mirage (default in settings + usePriceCheck)
- **GGG Public API**: `pathofexile.com/character-window/get-characters?accountName=XXX` (no auth needed, profile must be public). Realm parameter `?realm=poe2` for PoE2 characters.
- **User's account**: yurikoeth#5030, active character: witchtimee (Elementalist/Witch, PoE1)
- **Item text format**: Sections separated by "--------", starts with "Item Class:" (PoE2) or "Rarity:" (PoE1)
- **Mod tier system**: T1 = best (iLvl 82-86 required), T5 = worst common. High-value combos: T1 life + triple T1 res, speed + damage.

## Current Status

**Implemented:**
1. **Shared package**: Item parser, client-log parser, poe.ninja client, GGG Trade client (55+ stat mappings), rate limiter, dangerous mods DB (with build personalization), mod tier evaluator (30+ mods with T1-T5 ranges), stat mappings, map database, hideout names, leveling guides (PoE1 Acts 1-10, PoE2 Acts 1-6), atlas strategies (8 curated), trade whisper parser
2. **Overlay — Core**: Tauri app with Rust clipboard watcher + polling log watcher, React UI with home menu grid navigation
3. **Overlay — Price Check**: Mod tier evaluation (T1-T5 with roll ranges + quality bars), price estimation formula, poe.ninja lookup via Rust proxy, combo detection (triple res, life+res, speed+dmg)
4. **Overlay — Characters**: GGG public API integration (PoE1 + PoE2, deduped), gear viewer with socket colors + links, build goals (name/focus/budget/notes), AI build analysis (Witch persona), active build system
5. **Overlay — AI**: Claude API through Rust (ai.rs) with Witch persona on all responses. Ask AI chat with image/vision support, saved chat history. WitchSays component for consistent styling. Build analysis, price insights, trade whisper analysis.
6. **Overlay — Market**: Live poe.ninja prices via Rust proxy, category browsing, search, 7-day trends
7. **Overlay — Leveling**: PoE1 (10 acts) + PoE2 (6 acts) guides with per-character checklists, auto-advancing zone detection
8. **Overlay — Map Speedrun**: MapTimer, SpeedrunStats, MapSplitDisplay, auto-tracking via zone events
9. **Overlay — Flip Tracker**: Trade whisper parsing, buy/sell tracking, running profit
10. **Overlay — Atlas Helper**: 8 curated strategies with maps, passives, game plans
11. **Overlay — Settings**: SQLite persistence, Settings UI (General, Overlay, Build Profile, AI with API key), tray menu
12. **Web**: Scaffold with Dashboard and Characters pages (placeholder content)

**Not yet implemented:**
- GGG OAuth2 flow (full API access — stash tabs, private profiles)
- Session sync (overlay → web via Supabase)
- Tauri Windows packaging/installer (.msi/.exe)
- Web dashboard pages for speedrun history and map analytics
- Snipe alerts (background trade polling for underpriced items)
- GGG Trade API for rare pricing (needs Rust proxy, currently only mod-tier estimation)

## Conventions

- TypeScript strict mode everywhere
- Package scope: `@exiled-orb/*` (shared, overlay, web)
- Shared package uses subpath exports (`@exiled-orb/shared/types`, `/parsers`, `/api`, `/data`)
- Rust code uses snake_case, serde renames to camelCase for JS interop
- All prices expressed in chaos orbs, with divine conversion via poe.ninja rates
- Overlay uses home → page navigation (no tab bar), Esc to go back
- One Zustand store per feature domain (overlay, settings, speedrun, ai, build)
- AI uses Haiku for fast responses, Sonnet for deep analysis (build analyzer)
- All AI responses wrapped in WitchSays component with Witch portrait
- Shared store access via utils/store.ts (getStore, getApiKey, saveApiKey)

## Known Issues / Notes

- **Disk space**: Rust debug builds consume ~6-7GB. Run `cargo clean` in src-tauri/ to free space. Consider release builds for smaller footprint.
- **poe.ninja CORS**: All poe.ninja/trade API calls must go through Rust fetch_ninja proxy. Direct browser fetch() will fail.
- **AI JSON parsing**: Claude sometimes returns malformed JSON with the Witch persona. The parseAiJson helper handles code fences, trailing commas, truncation, and auto-closes open brackets.
- **League name**: Hardcoded to "Mirage" in DEFAULT_SETTINGS and usePriceCheck fallback. Must update each league.
