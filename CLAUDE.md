# PoE Helper

Path of Exile helper application — desktop overlay + web dashboard for PoE1 & PoE2.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Overlay**: Tauri v2 (Rust backend + React 19 frontend), transparent always-on-top window
- **Web**: React 19 + Vite, deployed to Vercel with serverless API routes
- **Shared**: TypeScript library with item/log parsers, API clients, type definitions
- **State**: Zustand (both overlay and web)
- **Styling**: Tailwind CSS v4
- **DB**: SQLite (overlay local), Supabase (web cloud)
- **Testing**: Vitest

## Project Layout

```
poe-helper/
├── packages/shared/src/         # Shared library
│   ├── types/                   # Item, Character, Currency, Map, Session types
│   ├── parsers/                 # item-parser.ts (clipboard), client-log.ts (Client.txt)
│   ├── api/                     # poe-ninja.ts, ggg-trade.ts, rate-limiter.ts
│   ├── data/                    # dangerous-mods.ts (curated map mod danger DB)
│   └── utils/                   # format.ts, constants.ts (paths, API URLs, defaults)
├── apps/overlay/                # Tauri desktop overlay
│   ├── src-tauri/src/           # Rust: clipboard.rs, log_watcher.rs, lib.rs
│   └── src/                     # React: PriceCheck, MapModWarnings, ZoneTracker
│       ├── hooks/               # useClipboard, useClientLog, usePriceCheck
│       ├── components/          # PriceCheck.tsx, MapModWarnings.tsx, ZoneTracker.tsx
│       └── stores/              # overlay-store.ts (Zustand)
├── apps/web/                    # Web dashboard
│   └── src/pages/               # Dashboard.tsx, Characters.tsx
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
```

## Architecture

### Data Flow: Price Check
```
Ctrl+C in PoE → OS clipboard
  → Rust clipboard.rs (polls 200ms, detects "Item Class:"/"Rarity:" pattern)
  → Tauri "clipboard-item" event → useClipboard hook
  → item-parser.ts → structured ParsedItem
  → usePriceCheck: currency/unique/gem/divcard → poe.ninja (5min cache)
                    rares → GGG Trade API (12req/10s limit)
  → PriceCheck.tsx overlay panel (auto-fades 10s)
```

### Data Flow: Client.txt Monitoring
```
PoE writes Client.txt → Rust log_watcher.rs (notify crate, tail-only)
  → parse_log_line: zone/death/whisper/level_up/connected
  → Tauri "log-event" event → useClientLog hook
  → Zustand overlay-store → ZoneTracker UI
```

### Event-Driven Communication
Rust backend emits Tauri events, React hooks listen. No direct IPC calls for real-time data.

## Key Design Decisions

- **Clipboard polling (not hotkey interception)**: Same approach as GGG-sanctioned tools (Awakened PoE Trade). No memory reading or packet injection — safe from anti-cheat.
- **Client.txt tail-only**: Seeks to EOF on startup, only reads new lines. Handles multi-GB log files efficiently.
- **poe.ninja first, Trade API fallback**: poe.ninja has no auth and more generous limits. Trade API used only for rares.
- **Game-agnostic via `game: 'poe1' | 'poe2'`**: All types, parsers, and APIs support both games through this parameter.
- **Separate poe.ninja domains**: poe.ninja (PoE1) vs poe2.ninja (PoE2).

## PoE-Specific Knowledge

- **Client.txt paths (Windows)**:
  - PoE1 standalone: `%USERPROFILE%/Documents/My Games/Path of Exile/logs/Client.txt`
  - PoE1 Steam: `C:/Program Files (x86)/Steam/steamapps/common/Path of Exile/logs/Client.txt`
  - PoE2: Similar paths with "Path of Exile 2"
- **GGG Trade rate limits**: Reported via `X-Rate-Limit-Ip` header, currently 12req/10s
- **Item text format**: Sections separated by "--------", starts with "Item Class:" (PoE2) or "Rarity:" (PoE1)
- **8 PoE2 base classes**: Warrior, Mercenary, Ranger, Sorceress, Witch, Monk, Huntress, Druid (each with 2-3 ascendancies)

## Current Status

**MVP Phase 1 — implemented:**
1. Shared package: item parser, client-log parser, poe.ninja client, GGG Trade client, rate limiter, dangerous mods DB, all types
2. Overlay: Tauri app with Rust clipboard watcher + log watcher, React UI for PriceCheck, MapModWarnings, ZoneTracker
3. Web: Scaffold with Dashboard and Characters pages (placeholder content)

**Not yet implemented:**
- GGG OAuth2 flow (web)
- SQLite local storage (overlay)
- Session sync (overlay → web)
- Boss cheat sheets, atlas tracker, crafting helper (Phase 2-3)
- Tauri Windows packaging/installer

## Conventions

- TypeScript strict mode everywhere
- Shared package uses subpath exports (`@poe-helper/shared/types`, `/parsers`, `/api`, `/data`)
- Rust code uses snake_case, serde renames to camelCase for JS interop
- All prices expressed in chaos orbs, with divine conversion via poe.ninja rates
- Overlay components auto-dismiss (default 10s configurable via OVERLAY_DEFAULTS)
