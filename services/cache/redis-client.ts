/**
 * Redis client singleton — Step 5.
 * Install driver:  npm install ioredis
 * Env vars:        REDIS_URL  (e.g. redis://:password@localhost:6379/0)
 *
 * TTL constants are the single source of truth for cache freshness.
 * Every caller must pass one of these — bare numbers are forbidden so
 * stale-price bugs are caught at the type level.
 */

// ioredis is a peer dependency (npm install ioredis).
// Using `any` stub so the project compiles without the package installed.
// Swap for `import type { Redis } from "ioredis"` once installed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Redis = any;

// ── TTL constants ─────────────────────────────────────────────────────────────
//
// Pricing data has strict freshness requirements:
//   • Spot prices     15 min  — air fares change every few minutes; longer = stale UX
//   • Route metadata   6 h    — schedule/stop-count changes are infrequent
//   • Hub status       5 min  — operational alerts must propagate quickly
//   • NLP results      1 h    — parsed intents are user-specific, reuse if query repeats

export const TTL = {
  PRICE_SECONDS:         15 * 60,   // 900 s  — spot fare
  ROUTE_META_SECONDS:     6 * 3600, // 21 600 s — schedule / stops / duration
  HUB_STATUS_SECONDS:     5 * 60,   // 300 s  — operational status
  NLP_INTENT_SECONDS:    60 * 60,   // 3 600 s — parsed search intent
} as const;

export type TtlKey = keyof typeof TTL;

// ── Key namespacing ───────────────────────────────────────────────────────────

export const key = {
  price:     (origin: string, dest: string, date: string) => `price:${origin}:${dest}:${date}`,
  route:     (origin: string, dest: string)               => `route:${origin}:${dest}`,
  hubStatus: (code: string)                               => `hub:${code}:status`,
  nlpIntent: (hash: string)                               => `nlp:intent:${hash}`,
  prefetch:  (origin: string, dest: string)               => `prefetch:${origin}:${dest}`,
};

// ── Client class ──────────────────────────────────────────────────────────────

export class RedisClient {
  private client: Redis | null = null;

  private async connect(): Promise<Redis> {
    if (this.client) return this.client;
    // @ts-ignore — ioredis is an optional peer dep; install with: npm install ioredis
    const { default: Redis } = await import("ioredis");
    this.client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect:           true,
      enableReadyCheck:      true,
      maxRetriesPerRequest:  2,
      connectTimeout:        3_000,
      commandTimeout:        2_000,
    });
    await this.client.connect();
    return this.client;
  }

  async get<T>(k: string): Promise<T | null> {
    try {
      const r = await (await this.connect()).get(k);
      return r ? (JSON.parse(r) as T) : null;
    } catch {
      return null; // cache miss on connection error — always degrade gracefully
    }
  }

  async set<T>(k: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await (await this.connect()).set(k, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // Non-fatal — write failures are silent; the live path will be used instead.
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) await (await this.connect()).del(...keys);
    } catch { /* silent */ }
  }

  /** Increment a counter (used for rate-limiting prefetch runs). */
  async incr(k: string, ttlSeconds: number): Promise<number> {
    try {
      const r = await (await this.connect()).incr(k);
      if (r === 1) await (await this.connect()).expire(k, ttlSeconds);
      return r;
    } catch {
      return 0;
    }
  }

  async close(): Promise<void> {
    await this.client?.quit();
    this.client = null;
  }

  static isAvailable(): boolean {
    return Boolean(process.env.REDIS_URL);
  }
}

export const cache = new RedisClient();
