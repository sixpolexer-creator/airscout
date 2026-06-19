import { describe, it, expect, vi } from "vitest";
import { fanOutSearch } from "@/lib/adapters/orchestrator";
import type { OrchestratorParams } from "@/lib/adapters/orchestrator";
import type { FlightAdapter } from "@/lib/adapters/types";
import type { FlightOffer, SearchQuery } from "@/lib/types";

function makeAdapter(id: string, offers: FlightOffer[], delayMs = 0): FlightAdapter {
  return {
    id,
    label: id,
    isAvailable: () => true,
    search: vi.fn(async () => {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return offers;
    }),
  };
}

function makeOffer(id: string): FlightOffer {
  return {
    id,
    source: "test",
    segments: [
      {
        carrier: "Test",
        carrierCode: "TS",
        flightNumber: "TS001",
        from: "AAA",
        to: "BBB",
        departUtc: "2026-06-17T10:00:00Z",
        arriveUtc: "2026-06-17T12:00:00Z",
        durationMin: 120,
      },
    ],
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
  origin: "AAA",
  destination: "BBB",
  departDate: "2026-06-17",
  passengers: 1,
  cabin: "economy",
  flexDays: 0,
};

const BASE_PARAMS: OrchestratorParams = {
  adapters: [],
  dateQueries: [BASE_QUERY],
  destinations: [{ code: "BBB", km: 0 }],
  baseQuery: BASE_QUERY,
  onEvent: vi.fn(),
};

describe("fanOutSearch", () => {
  it("aggregates offers from multiple adapters", async () => {
    const p: OrchestratorParams = {
      ...BASE_PARAMS,
      adapters: [
        makeAdapter("a", [makeOffer("offer-a")]),
        makeAdapter("b", [makeOffer("offer-b"), makeOffer("offer-c")]),
      ],
    };
    const offers = await fanOutSearch(p);
    expect(offers).toHaveLength(3);
    expect(offers.map((o) => o.id)).toContain("offer-a");
    expect(offers.map((o) => o.id)).toContain("offer-b");
  });

  it("continues when one adapter throws (error isolation)", async () => {
    const bad: FlightAdapter = {
      id: "bad",
      label: "bad",
      isAvailable: () => true,
      search: vi.fn(async () => { throw new Error("carrier down"); }),
    };
    const good = makeAdapter("good", [makeOffer("good-offer")]);
    const p: OrchestratorParams = { ...BASE_PARAMS, adapters: [bad, good] };
    const offers = await fanOutSearch(p);
    expect(offers).toHaveLength(1);
    expect(offers[0].id).toBe("good-offer");
  });

  it("emits a 'fetch' status event per task before calling adapter", async () => {
    const events: string[] = [];
    const p: OrchestratorParams = {
      ...BASE_PARAMS,
      adapters: [makeAdapter("a", [])],
      onEvent: (e) => events.push(e.type === "status" ? e.phase : e.type),
    };
    await fanOutSearch(p);
    expect(events.filter((e) => e === "fetch")).toHaveLength(1);
  });

  it("emits a 'fetched' status event after each adapter returns", async () => {
    const events: string[] = [];
    const p: OrchestratorParams = {
      ...BASE_PARAMS,
      adapters: [makeAdapter("a", [makeOffer("x")])],
      onEvent: (e) => events.push(e.type === "status" ? e.phase : e.type),
    };
    await fanOutSearch(p);
    expect(events.filter((e) => e === "fetched")).toHaveLength(1);
  });

  it("emits a 'fallback' event when adapter throws", async () => {
    const events: string[] = [];
    const bad: FlightAdapter = {
      id: "bad",
      label: "bad",
      isAvailable: () => true,
      search: vi.fn(async () => { throw new Error("oops"); }),
    };
    const p: OrchestratorParams = {
      ...BASE_PARAMS,
      adapters: [bad],
      onEvent: (e) => events.push(e.type === "status" ? e.phase : e.type),
    };
    await fanOutSearch(p);
    expect(events).toContain("fallback");
  });

  it("fans out all adapters concurrently (total time ≈ max single delay)", async () => {
    const DELAY = 80;
    const p: OrchestratorParams = {
      ...BASE_PARAMS,
      adapters: [
        makeAdapter("a", [], DELAY),
        makeAdapter("b", [], DELAY),
        makeAdapter("c", [], DELAY),
      ],
    };
    const start = Date.now();
    await fanOutSearch(p);
    const elapsed = Date.now() - start;
    // Sequential would be 3×DELAY=240ms. Concurrent should finish in ≤ DELAY + 50ms slack.
    expect(elapsed).toBeLessThan(DELAY + 60);
  }, 10_000);

  it("stamps nearbyKm on offers from alternate-airport destinations", async () => {
    const p: OrchestratorParams = {
      ...BASE_PARAMS,
      destinations: [{ code: "BBB", km: 0 }, { code: "CCC", km: 45 }],
      adapters: [makeAdapter("a", [makeOffer("near")])],
    };
    const offers = await fanOutSearch(p);
    const altOffer = offers.find((o) => o.nearbyKm === 45);
    expect(altOffer).toBeDefined();
  });

  it("returns [] when adapter list is empty", async () => {
    const offers = await fanOutSearch({ ...BASE_PARAMS, adapters: [] });
    expect(offers).toEqual([]);
  });
});
