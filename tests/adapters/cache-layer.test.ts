import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted — use vi.hoisted so the variables exist before the factory runs.
const { mockGet, mockSet, mockIsAvailable } = vi.hoisted(() => ({
  mockGet: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
  mockSet: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  mockIsAvailable: vi.fn<() => boolean>().mockReturnValue(true),
}));

vi.mock("@/services/cache/redis-client", () => ({
  RedisClient: { isAvailable: mockIsAvailable },
  cache: { get: mockGet, set: mockSet },
  TTL: { PRICE_SECONDS: 900 },
}));

import { buildSearchCacheKey, withSearchCache } from "@/lib/adapters/cache-layer";
import type { FlightOffer, SearchQuery } from "@/lib/types";

function makeOffer(id: string): FlightOffer {
  return {
    id,
    source: "test",
    segments: [],
    origin: "AAA",
    destination: "BBB",
    departDate: "2026-06-17",
    priceTotal: 100,
    priceCurrency: "USD",
    baseFare: 80,
    taxes: 20,
    baggageFee: 0,
    baggageIncluded: true,
    durationMin: 120,
    layoverMin: 0,
    stops: 0,
    separateTickets: false,
    roundTrip: false,
    alliance: "None",
    carrierType: "Legacy",
    cabin: "economy",
  };
}

const BASE_QUERY: SearchQuery = {
  origin: "TLV",
  destination: "LHR",
  departDate: "2026-06-17",
  passengers: 1,
  cabin: "economy",
  flexDays: 0,
};

beforeEach(() => {
  mockGet.mockReset();
  mockSet.mockReset();
  mockIsAvailable.mockReset();
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue(undefined);
  mockIsAvailable.mockReturnValue(true);
});

describe("buildSearchCacheKey", () => {
  it("returns a stable string for the same query", () => {
    const k1 = buildSearchCacheKey(BASE_QUERY);
    const k2 = buildSearchCacheKey({ ...BASE_QUERY });
    expect(k1).toBe(k2);
  });

  it("returns different keys for different origins", () => {
    const k1 = buildSearchCacheKey(BASE_QUERY);
    const k2 = buildSearchCacheKey({ ...BASE_QUERY, origin: "CDG" });
    expect(k1).not.toBe(k2);
  });

  it("returns different keys for different cabin classes", () => {
    const k1 = buildSearchCacheKey(BASE_QUERY);
    const k2 = buildSearchCacheKey({ ...BASE_QUERY, cabin: "business" });
    expect(k1).not.toBe(k2);
  });

  it("returns different keys when trip duration constraints differ", () => {
    const base = buildSearchCacheKey(BASE_QUERY);
    const withTrip = buildSearchCacheKey({ ...BASE_QUERY, tripDaysMin: 4, tripDaysMax: 10 });
    const withOtherTrip = buildSearchCacheKey({ ...BASE_QUERY, tripDaysMin: 7, tripDaysMax: 7 });
    expect(base).not.toBe(withTrip);
    expect(withTrip).not.toBe(withOtherTrip);
  });
});

describe("withSearchCache", () => {
  it("returns cached data without calling fn on hit", async () => {
    const cached = [makeOffer("cached")];
    mockGet.mockResolvedValue(cached);
    const fn = vi.fn().mockResolvedValue([makeOffer("fresh")]);

    const result = await withSearchCache(BASE_QUERY, fn);
    expect(result).toBe(cached);
    expect(fn).not.toHaveBeenCalled();
  });

  it("calls fn and stores result on cache miss", async () => {
    const fresh = [makeOffer("fresh")];
    mockGet.mockResolvedValue(null);
    const fn = vi.fn().mockResolvedValue(fresh);

    const result = await withSearchCache(BASE_QUERY, fn);
    expect(result).toBe(fresh);
    expect(fn).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith(expect.any(String), fresh, 900);
  });

  it("bypasses cache and calls fn when Redis is not available", async () => {
    mockIsAvailable.mockReturnValue(false);
    const fresh = [makeOffer("fresh")];
    const fn = vi.fn().mockResolvedValue(fresh);

    const result = await withSearchCache(BASE_QUERY, fn);
    expect(result).toBe(fresh);
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("does not cache empty results", async () => {
    mockGet.mockResolvedValue(null);
    const fn = vi.fn().mockResolvedValue([]);

    await withSearchCache(BASE_QUERY, fn);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
