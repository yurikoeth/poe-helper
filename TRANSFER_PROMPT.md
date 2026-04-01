# ExiledOrb — Conversation Transfer Prompt

Copy and paste this into a new Claude Code session on your Windows machine after cloning the repo.

---

## Prompt

I'm continuing work on `exiled-orb`, an all-in-one Path of Exile companion application. Read the CLAUDE.md for full project context.

### What's been built so far

This is a **pnpm + Turborepo monorepo** with three packages:

1. **`packages/shared`** — TypeScript library (fully implemented)
   - Item clipboard parser (`item-parser.ts`) — parses Ctrl+C'd item text into structured `ParsedItem` objects. Handles PoE1 and PoE2 formats, all item types (currency, uniques, rares, maps, gems, div cards), sockets, influences, corruption.
   - Client.txt log parser (`client-log.ts`) — parses zone entries, deaths, whispers, level ups, instance connections.
   - poe.ninja API client — price lookups with 5-minute TTL cache, supports all 21 item categories, both poe.ninja and poe2.ninja.
   - GGG Trade API client — fuzzy rare item search, multi-step search→fetch→aggregate flow, rate limited at 12req/10s.
   - Rate limiter — sliding window with GGG header parsing.
   - Dangerous mods database — 20+ curated map mods with danger levels (deadly/dangerous/caution/safe) and build-specific context.
   - Full type system: ParsedItem, PriceResult, Character, League, CurrencyRate, MapAnalysis, Session, LogEvent.
   - Unit tests for parsers (vitest).

2. **`apps/overlay`** — Tauri v2 desktop app (structurally complete, needs Windows to build)
   - **Rust backend**: Clipboard watcher (polls 200ms via arboard), Client.txt log watcher (notify crate, tail-only), auto-detects PoE install paths.
   - **React frontend**: PriceCheck panel (item display, price, confidence, trade link, auto-fade), MapModWarnings panel (color-coded danger per mod), ZoneTracker HUD (current zone, session timer, death counter).
   - **Zustand store**: UI visibility, active panel routing, price/map/zone state.
   - **Hooks**: useClipboard (routes items vs maps), useClientLog (zone/death/level events), usePriceCheck (poe.ninja → trade fallback).
   - **Tauri config**: Two windows — overlay (420x650, transparent, always-on-top) and settings (900x700, hidden).
   - F5 toggles overlay, Esc dismisses current panel.

3. **`apps/web`** — React web dashboard (scaffold only)
   - Dashboard page with placeholder stats.
   - Characters page with OAuth placeholder.
   - Routing: `/` → Dashboard, `/characters` → Characters.

### What needs to happen next

The immediate priorities are:

1. **Settings system + SQLite persistence** — Tauri SQL plugin for overlay settings, map run history, session data.

2. **Fix GGG Trade client** — stat-to-ID mappings are stubbed, divine rate is hardcoded, PoE2 URLs need fixing.

3. **Map speedrun/grinding tracker** — Auto-detect map runs from Client.txt zone events, live timer, maps/hour, splits.

4. **AI-assisted trading** — Claude API integration (through Rust backend) for mod analysis, price recommendations, trade whisper assistance.

### Roadmap

- **Phase 1 (Foundation)**: Settings system, SQLite, fix GGG Trade ✅ Price checker ✅ Map mod warnings ✅ Zone tracker
- **Phase 2**: Map speedrun/grinding tracker (live timer, maps/hour, splits, session stats)
- **Phase 3**: AI-assisted trading (Claude API — mod tiers, price recs, trade whisper assistant, snipe alerts)
- **Phase 4**: Leveling overlay, currency flip tracker, atlas strategy helper, personalized map mod warnings

### Key technical notes

- Both PoE1 and PoE2 supported via `game: 'poe1' | 'poe2'` parameter throughout
- poe.ninja (PoE1) and poe2.ninja (PoE2) are separate domains
- GGG Trade API reports rate limits via `X-Rate-Limit-Ip` header
- Item text detection: look for "Item Class:" (PoE2) or "Rarity:" (PoE1) plus "--------" separators
- Overlay approach (clipboard + log file reading) is the same as GGG-sanctioned tools — safe from anti-cheat
- Default league in usePriceCheck is hardcoded to "Settlers of Kalguur" — will need updating per league
- AI features use user's own Claude API key, calls routed through Rust backend to protect the key
