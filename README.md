# AirScout — AI Flight Deal Engine

Autonomous, source-agnostic flight search. AI agents scan inventories, normalize
mismatched carrier data into one schema, reason about hidden pricing
inefficiencies (separate tickets, alternate-airport layovers, flex-date windows),
and stream ranked deals into a live UI.

Runs end-to-end with **zero configuration** on a built-in mock inventory.

## Quick start

```bash
cd airscout
npm install
npm run dev
# open http://localhost:3000
```

Optionally copy `.env.example` → `.env.local` and add keys to enable the
real LLM routing brain (`ANTHROPIC_API_KEY`) and live data (`DUFFEL_TOKEN`).

## Architecture

```
Browser (Next.js App Router, Tailwind, zustand)
  components/SearchForm + Calendar  ──▶  POST /api/search
                                          │
  components/DealFeed  ◀── NDJSON stream ─┤  app/api/search/route.ts  (orchestrator)
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
            lib/flex.ts          lib/adapters/*         lib/reasoning.ts
        (±N day expansion)   (mock | duffel | …,     (Claude re-rank +
                              normalized schema)      heuristic fallback)
                                          │
                                 lib/normalize.ts (dedupe, median, coeff)
```

### Why adapters instead of scraping
Defeating airline anti-bot protection is fragile and against site terms. AirScout
talks to licensed aggregators (Duffel today; Amadeus/Kiwi drop in behind the same
`FlightAdapter` interface) and ships a realistic mock so the app always runs.

### The unified schema
`lib/types.ts` defines `FlightOffer` — the single contract every adapter
normalizes into and every agent passes downstream. `RankedOffer` extends it with
the engine's verdict (rank, `efficiencyCoeff` = cost per travel hour, savings,
human-readable reasons, risk warnings).

### The reasoning brain
`lib/reasoning.ts` always computes a deterministic price-to-duration ranking, then
(if `ANTHROPIC_API_KEY` is set) asks Claude to re-rank the shortlist — weighing
separate-ticket risk, short connections, and genuine undercuts. Any LLM/parse
failure degrades gracefully to the heuristic.

## Extending
- **New data source:** implement `FlightAdapter` in `lib/adapters/`, register it
  in `lib/adapters/index.ts`. Set `isAvailable()` to gate on its env keys.
- **New ranking signal:** add a field to `RankedOffer` and populate it in
  `heuristicRank`; surface it in `components/DealFeed.tsx`.
