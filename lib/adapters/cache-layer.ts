import type { FlightOffer, SearchQuery } from "@/lib/types";
import { cache, RedisClient, TTL } from "@/services/cache/redis-client";

export function buildSearchCacheKey(query: SearchQuery): string {
  const {
    origin,
    destination,
    departDate,
    passengers = 1,
    cabin = "economy",
    flexDays = 0,
    includeNearby = false,
    returnDate = "",
    tripDaysMin,
    tripDaysMax,
  } = query;
  const tripTag = tripDaysMin != null ? `:t${tripDaysMin}-${tripDaysMax ?? tripDaysMin}` : "";
  return `search:${origin}:${destination}:${departDate}:${returnDate}:${passengers}:${cabin}:${flexDays}:${includeNearby}${tripTag}`;
}

export async function withSearchCache(
  query: SearchQuery,
  fn: () => Promise<FlightOffer[]>,
): Promise<FlightOffer[]> {
  if (!RedisClient.isAvailable()) return fn();

  const k = buildSearchCacheKey(query);
  const hit = await cache.get<FlightOffer[]>(k);
  if (hit) return hit;

  const result = await fn();
  if (result.length > 0) await cache.set(k, result, TTL.PRICE_SECONDS);
  return result;
}
