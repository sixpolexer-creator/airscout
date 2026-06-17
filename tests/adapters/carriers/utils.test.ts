import { describe, it, expect } from "vitest";
import {
  parseIsoDuration,
  parseHHMM,
  elapsedMinutes,
  totalAirMinutes,
  layoverMinutes,
  browserHeaders,
} from "@/lib/adapters/carriers/utils";
import type { FlightSegment } from "@/lib/types";

describe("parseIsoDuration", () => {
  it("parses hours and minutes", () => {
    expect(parseIsoDuration("PT7H30M")).toBe(450);
  });
  it("parses minutes only", () => {
    expect(parseIsoDuration("PT45M")).toBe(45);
  });
  it("parses hours only", () => {
    expect(parseIsoDuration("PT2H")).toBe(120);
  });
  it("returns 0 for unrecognised format", () => {
    expect(parseIsoDuration("garbage")).toBe(0);
  });
  it("handles zero duration", () => {
    expect(parseIsoDuration("PT0M")).toBe(0);
  });
});

describe("parseHHMM", () => {
  it("parses Ryanair-style duration '0002:30'", () => {
    expect(parseHHMM("0002:30")).toBe(150);
  });
  it("parses '0000:45'", () => {
    expect(parseHHMM("0000:45")).toBe(45);
  });
  it("parses single-digit hour '0001:05'", () => {
    expect(parseHHMM("0001:05")).toBe(65);
  });
});

describe("elapsedMinutes", () => {
  it("computes elapsed wall-clock minutes", () => {
    expect(elapsedMinutes("2026-06-17T10:00:00Z", "2026-06-17T12:30:00Z")).toBe(150);
  });
  it("returns 0 when times are equal", () => {
    expect(elapsedMinutes("2026-06-17T10:00:00Z", "2026-06-17T10:00:00Z")).toBe(0);
  });
  it("clamps negative values to 0", () => {
    expect(elapsedMinutes("2026-06-17T12:00:00Z", "2026-06-17T10:00:00Z")).toBe(0);
  });
});

describe("totalAirMinutes", () => {
  it("sums segment durations", () => {
    expect(totalAirMinutes([{ durationMin: 90 }, { durationMin: 60 }])).toBe(150);
  });
  it("returns 0 for empty array", () => {
    expect(totalAirMinutes([])).toBe(0);
  });
});

describe("layoverMinutes", () => {
  const seg = (durationMin: number): FlightSegment => ({
    carrier: "Test",
    carrierCode: "TS",
    flightNumber: "TS001",
    from: "A",
    to: "B",
    departUtc: "2026-06-17T10:00:00Z",
    arriveUtc: "2026-06-17T12:00:00Z",
    durationMin,
  });
  it("computes layover as elapsed minus air time", () => {
    expect(layoverMinutes([seg(90), seg(90)], 240)).toBe(60);
  });
  it("clamps to 0 when no layover", () => {
    expect(layoverMinutes([seg(90)], 90)).toBe(0);
  });
});

describe("browserHeaders", () => {
  it("includes User-Agent", () => {
    const h = browserHeaders("https://example.com");
    expect(h["User-Agent"]).toMatch(/Mozilla/);
  });
  it("sets Origin from siteOrigin parameter", () => {
    const h = browserHeaders("https://example.com");
    expect(h["Origin"]).toBe("https://example.com");
  });
  it("sets Referer with trailing slash", () => {
    const h = browserHeaders("https://example.com");
    expect(h["Referer"]).toBe("https://example.com/");
  });
});
