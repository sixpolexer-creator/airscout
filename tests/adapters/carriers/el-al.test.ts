import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { elAlAdapter } from "@/lib/adapters/carriers/el-al";
import type { SearchQuery } from "@/lib/types";

const BASE_QUERY: SearchQuery = {
  origin: "TLV",
  destination: "LHR",
  departDate: "2026-06-17",
  passengers: 1,
  cabin: "economy",
  flexDays: 0,
};

const MOCK_RESPONSE = {
  outboundFlights: [
    {
      flightId: "LY317-20260617",
      segments: [
        {
          flightNumber: "LY317",
          from: "TLV",
          to: "LHR",
          departureTime: "2026-06-17T09:30:00Z",
          arrivalTime: "2026-06-17T15:00:00Z",
          duration: "PT5H30M",
          aircraftType: "B789",
        },
      ],
      price: {
        amount: 450.0,
        currency: "USD",
        taxes: 85.0,
        baseFare: 365.0,
      },
      baggageIncluded: true,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_RESPONSE,
  }));
  process.env.ELAL_ENABLED = "1";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ELAL_ENABLED;
});

describe("elAlAdapter", () => {
  it("is available when ELAL_ENABLED=1", () => {
    expect(elAlAdapter.isAvailable()).toBe(true);
  });

  it("is unavailable when ELAL_ENABLED is unset", () => {
    delete process.env.ELAL_ENABLED;
    expect(elAlAdapter.isAvailable()).toBe(false);
  });

  it("returns normalised FlightOffer array", async () => {
    const offers = await elAlAdapter.search(BASE_QUERY);
    expect(offers).toHaveLength(1);
    const o = offers[0];
    expect(o.source).toBe("el-al");
    expect(o.origin).toBe("TLV");
    expect(o.destination).toBe("LHR");
    expect(o.segments).toHaveLength(1);
    expect(o.segments[0].carrierCode).toBe("LY");
    expect(o.priceTotal).toBe(450);
    expect(o.baseFare).toBe(365);
    expect(o.taxes).toBe(85);
    expect(o.baggageIncluded).toBe(true);
    expect(o.stops).toBe(0);
    expect(o.durationMin).toBe(330); // PT5H30M = 330 min
    expect(o.cabin).toBe("economy");
  });

  it("returns [] when the API call throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const offers = await elAlAdapter.search(BASE_QUERY);
    expect(offers).toEqual([]);
  });

  it("returns [] when API returns HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const offers = await elAlAdapter.search(BASE_QUERY);
    expect(offers).toEqual([]);
  });
});
