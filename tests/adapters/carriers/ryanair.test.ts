import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ryanairAdapter } from "@/lib/adapters/carriers/ryanair";
import type { SearchQuery } from "@/lib/types";

const BASE_QUERY: SearchQuery = {
  origin: "DUB",
  destination: "BCN",
  departDate: "2026-06-17",
  passengers: 1,
  cabin: "economy",
  flexDays: 0,
};

const MOCK_RESPONSE = {
  currency: "EUR",
  trips: [
    {
      origin: "DUB",
      destination: "BCN",
      dates: [
        {
          dateOut: "2026-06-17T00:00:00.000",
          flights: [
            {
              flightKey: "FR~1234",
              segments: [
                {
                  segmentNr: 0,
                  origin: "DUB",
                  destination: "BCN",
                  flightNumber: "FR 1234",
                  time: ["2026-06-17T06:00:00.000", "2026-06-17T08:30:00.000"],
                  timeUTC: ["2026-06-17T05:00:00.000", "2026-06-17T07:30:00.000"],
                  duration: "0002:30",
                },
              ],
              regularFare: {
                fares: [{ type: "ADT", amount: 29.99, count: 1 }],
              },
            },
          ],
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_RESPONSE,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ryanairAdapter", () => {
  it("is always available", () => {
    expect(ryanairAdapter.isAvailable()).toBe(true);
  });

  it("returns a normalised FlightOffer", async () => {
    const offers = await ryanairAdapter.search(BASE_QUERY);
    expect(offers).toHaveLength(1);
    const o = offers[0];
    expect(o.source).toBe("ryanair");
    expect(o.segments[0].carrierCode).toBe("FR");
    expect(o.segments[0].flightNumber).toBe("FR1234");
    expect(o.durationMin).toBe(150); // "0002:30"
    expect(o.priceTotal).toBeCloseTo(29.99);
    expect(o.priceCurrency).toBe("EUR");
    expect(o.stops).toBe(0);
    expect(o.cabin).toBe("economy");
  });

  it("uses UTC times for segment timestamps", async () => {
    const offers = await ryanairAdapter.search(BASE_QUERY);
    expect(offers[0].segments[0].departUtc).toBe("2026-06-17T05:00:00.000");
    expect(offers[0].segments[0].arriveUtc).toBe("2026-06-17T07:30:00.000");
  });

  it("returns [] on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await ryanairAdapter.search(BASE_QUERY)).toEqual([]);
  });

  it("returns [] on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    expect(await ryanairAdapter.search(BASE_QUERY)).toEqual([]);
  });

  it("skips flights with no regularFare", async () => {
    const noFare = {
      ...MOCK_RESPONSE,
      trips: [{
        ...MOCK_RESPONSE.trips[0],
        dates: [{
          dateOut: "2026-06-17T00:00:00.000",
          flights: [{ flightKey: "FR~0", segments: MOCK_RESPONSE.trips[0].dates[0].flights[0].segments }],
        }],
      }],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => noFare }));
    expect(await ryanairAdapter.search(BASE_QUERY)).toEqual([]);
  });
});
