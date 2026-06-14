/**
 * Predictive caching — background prefetch worker (Step 5).
 *
 * Run as a standalone Node process:
 *   npx tsx services/cache/prefetch-worker.ts
 *
 * Or schedule via cron (Docker / Vercel Cron / GitHub Actions):
 *   Schedule: every 12 minutes (just under the PRICE TTL of 15 min).
 *
 * Flow:
 *   1. Expand HOT_ROUTES × next N_DAYS departure dates
 *   2. For each route+date that has no live cache entry, call /api/search
 *   3. Store the ranked offers under the price key with TTL.PRICE_SECONDS
 *
 * Rate-limit: at most MAX_CONCURRENT fetches run in parallel to avoid
 * overwhelming the underlying flight adapters.
 */

import { cache, key, TTL, RedisClient } from "./redis-client";
import type { RankedOffer } from "@/lib/types";

// ── Config ────────────────────────────────────────────────────────────────────

const SEARCH_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** How many future departure dates to prefetch per route. */
const N_DAYS = 7;

/** Max parallel search calls (respect adapter rate limits). */
const MAX_CONCURRENT = 4;

/**
 * High-traffic routes to keep warm.
 * Deliberately limited to routes involving major international hubs
 * (per product requirement: scope = international hubs like TLV, LCA).
 */
const HOT_ROUTES: Array<{ origin: string; destination: string }> = [
  { origin: "TLV", destination: "LHR" },
  { origin: "TLV", destination: "CDG" },
  { origin: "TLV", destination: "FRA" },
  { origin: "TLV", destination: "AMS" },
  { origin: "TLV", destination: "DXB" },
  { origin: "LCA", destination: "LHR" },
  { origin: "LCA", destination: "AMS" },
  { origin: "LCA", destination: "ATH" },
  { origin: "LCA", destination: "FRA" },
  { origin: "JFK", destination: "LHR" },
  { origin: "JFK", destination: "CDG" },
  { origin: "DXB", destination: "LHR" },
  { origin: "DOH", destination: "JFK" },
  { origin: "SIN", destination: "LHR" },
];

// ── Date helpers ──────────────────────────────────────────────────────────────

function isoDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function buildTasks(): Array<{ origin: string; destination: string; departDate: string }> {
  const tasks = [];
  for (const route of HOT_ROUTES) {
    for (let i = 1; i <= N_DAYS; i++) {
      tasks.push({ ...route, departDate: isoDate(i) });
    }
  }
  return tasks;
}

// ── Fetch and cache ───────────────────────────────────────────────────────────

async function fetchAndCache(task: {
  origin: string;
  destination: string;
  departDate: string;
}): Promise<{ cached: boolean; route: string }> {
  const cacheKey = key.price(task.origin, task.destination, task.departDate);
  const route    = `${task.origin}→${task.destination} on ${task.departDate}`;

  // Skip if already warm (TTL > 0 means a valid entry exists).
  const existing = await cache.get<RankedOffer[]>(cacheKey);
  if (existing && existing.length > 0) {
    return { cached: false, route };
  }

  try {
    const res = await fetch(`${SEARCH_BASE_URL}/api/search`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin:      task.origin,
        destination: task.destination,
        departDate:  task.departDate,
        passengers:  1,
        cabin:       "economy",
        flexDays:    0,
        includeNearby: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok || !res.body) return { cached: false, route };

    // Collect all "deal" events from the NDJSON stream.
    const offers: RankedOffer[] = [];
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const evt = JSON.parse(line);
          if (evt.type === "deal") offers.push(evt.offer as RankedOffer);
        } catch { /* ignore partial lines */ }
      }
    }

    if (offers.length > 0) {
      // TTL: PRICE_SECONDS (15 min) — ensures users never see prices older than 15 min.
      // The worker re-runs every ~12 min, keeping the cache continuously warm.
      await cache.set(cacheKey, offers, TTL.PRICE_SECONDS);
      return { cached: true, route };
    }
  } catch (error) {
    console.error("Route failed because:", error, "— URL:", `${SEARCH_BASE_URL}/api/search`);
    // Non-fatal: on network error or timeout, the live path will be used instead.
  }

  return { cached: false, route };
}

// ── Concurrency limiter ───────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  limit: number,
): Promise<void> {
  const queue = [...items];
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) await fn(item);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function runPrefetchWorker(): Promise<void> {
  if (!RedisClient.isAvailable()) {
    console.warn("[prefetch] REDIS_URL not set — skipping prefetch run.");
    return;
  }

  const tasks = buildTasks();
  console.log(`[prefetch] Starting — ${tasks.length} route+date combinations.`);

  let warmed = 0;
  let skipped = 0;

  await runWithConcurrency(tasks, async (task) => {
    const { cached } = await fetchAndCache(task);
    if (cached) warmed++;
    else skipped++;
  }, MAX_CONCURRENT);

  console.log(`[prefetch] Done — ${warmed} warmed, ${skipped} already cached or failed.`);
  await cache.close();
}

// Run when executed directly.
if (require.main === module) {
  runPrefetchWorker().catch((err) => {
    console.error("[prefetch] Fatal error:", err);
    process.exit(1);
  });
}
