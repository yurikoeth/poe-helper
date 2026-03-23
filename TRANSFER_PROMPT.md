# PoE Helper — Conversation Transfer Prompt

Copy and paste this into a new Claude Code session on your Windows machine after cloning the repo.

---

## Prompt

I'm continuing work on `poe-helper`, a Path of Exile helper application I started on another machine. Read the CLAUDE.md for full project context.

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
   - **Tauri config**: Two windows — overlay (420x650, transparent, always-on-top, no decorations) and settings (900x700, hidden).
   - F5 toggles overlay, Esc dismisses current panel.

3. **`apps/web`** — React web dashboard (scaffold only)
   - Dashboard page with placeholder stats.
   - Characters page with OAuth placeholder.
   - Routing: `/` → Dashboard, `/characters` → Characters.

### What needs to happen next

The immediate priorities are:

1. **Verify the Tauri build compiles on Windows** — run `pnpm install` then `pnpm tauri dev` from `apps/overlay/`. The Rust code couldn't be verified on Linux (missing WebView2/GTK deps). On Windows with WebView2 (built-in on Win 10/11), it should compile cleanly.

2. **End-to-end test the overlay** — launch PoE, Ctrl+C an item, verify the price check overlay appears. Test with different item types (currency, unique, rare, map). Check that Client.txt zone/death tracking works.

3. **Implement GGG OAuth2** — needed for the web character dashboard. Flow: user clicks "Connect" → redirect to GGG OAuth → callback to Vercel serverless → store tokens in Supabase → fetch characters via API.

4. **Add SQLite local storage** — Tauri SQL plugin for overlay session history, price cache persistence, and user settings.

### Roadmap (from the plan)

- **Phase 1 (MVP)**: Price checker ✅, Map mod warnings ✅, Zone/death tracker ✅, Character dashboard (needs OAuth)
- **Phase 2**: Session tracker (XP/currency/hour), Boss mechanic cheat sheets, Atlas progression tracker, Trade search helper, Currency stash valuation
- **Phase 3**: Crafting helper, Build planner integration, League challenge tracker, Gem leveling tracker, Stash net worth history, Popular builds aggregation

### Key technical notes

- Both PoE1 and PoE2 supported via `game: 'poe1' | 'poe2'` parameter throughout
- poe.ninja (PoE1) and poe2.ninja (PoE2) are separate domains
- GGG Trade API reports rate limits via `X-Rate-Limit-Ip` header
- Item text detection: look for "Item Class:" (PoE2) or "Rarity:" (PoE1) plus "--------" separators
- Overlay approach (clipboard + log file reading) is the same as GGG-sanctioned tools — safe from anti-cheat
- Default league in usePriceCheck is hardcoded to "Settlers of Kalguur" — will need updating per league
