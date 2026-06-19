import { create } from "zustand";
import type { CabinClass, FeedEvent, RankedOffer } from "@/lib/types";
import type { AirlineCode, CarrierType } from "@/lib/airlines";
import type { CurrencyCode } from "@/lib/currency";

export type JourneyType = "Oneway" | "Roundtrip" | "Multi-City";
export type StopsFilter = "any" | "direct" | "1stop";

export interface MultiLeg {
  origin: string;
  destination: string;
  date: string;
}

// Instant client-side result filters (applied after the scan reveal).
export interface ResultFilters {
  stops: StopsFilter;
  outboundMaxStops: number | "any"; // per-leg: "any" = no cap
  returnMaxStops: number | "any";
  carrierTypes: CarrierType[]; // empty = all
  airlines: AirlineCode[];     // empty = all
  tripDaysMin: number | null;  // null = no constraint; range lower bound
  tripDaysMax: number | null;  // range upper bound
}

export interface SearchState {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers: number;
  cabin: CabinClass;
  flexDays: number;
  includeNearby: boolean;

  journeyType: JourneyType;
  currency: CurrencyCode;
  tripDaysEnabled: boolean;  // whether the trip-duration filter is active
  tripDays: number;          // stay length in days (2–21), used when tripDaysEnabled
  tripDurationFlex: number;  // ±N days window for Trip Duration filter (0–7); separate from calendar flexDays
  legs: MultiLeg[];          // multi-city legs (>= 2 when journeyType is Multi-City)
  filters: ResultFilters;

  searching: boolean;
  phase: "idle" | "scanning" | "results";
  statusLine: string;
  logLines: string[];
  deals: RankedOffer[];
  best: RankedOffer | null;
  scanned: number;
  error: string | null;

  set: (patch: Partial<SearchState>) => void;
  setFilter: (patch: Partial<ResultFilters>) => void;
  swap: () => void;
  run: () => Promise<void>;
}

// Minimum time the cinematic scan animation stays on screen, even if the
// mock inventory responds faster. Makes the prototype feel like a live AI.
const MIN_SCAN_MS = 3000;

export const useSearch = create<SearchState>((setState, getState) => ({
  origin: "JFK",
  destination: "LHR",
  departDate: "",
  returnDate: undefined,
  passengers: 1,
  cabin: "economy",
  flexDays: 3,
  includeNearby: false,

  journeyType: "Roundtrip",
  currency: "USD",
  tripDaysEnabled: false,
  tripDays: 7,
  tripDurationFlex: 2,
  legs: [
    { origin: "JFK", destination: "LHR", date: "" },
    { origin: "LHR", destination: "CDG", date: "" },
  ],
  filters: { stops: "any", outboundMaxStops: "any", returnMaxStops: "any", carrierTypes: [], airlines: [], tripDaysMin: null, tripDaysMax: null },

  searching: false,
  phase: "idle",
  statusLine: "",
  logLines: [],
  deals: [],
  best: null,
  scanned: 0,
  error: null,

  set: (patch) => setState(patch),

  setFilter: (patch) => setState({ filters: { ...getState().filters, ...patch } }),

  swap: () => {
    const { origin, destination } = getState();
    setState({ origin: destination, destination: origin });
  },

  run: async () => {
    const s = getState();

    // Build one request payload per journey type. Multi-City fans out into a
    // oneway scan per leg; results are grouped by route in the feed.
    type Payload = Record<string, unknown>;
    let payloads: Payload[];
    if (s.journeyType === "Multi-City") {
      const validLegs = s.legs.filter((l) => l.origin && l.destination && l.date);
      if (validLegs.length < 2) {
        setState({ error: "errorMinLegs" });
        return;
      }
      payloads = validLegs.map((l) => ({
        origin: l.origin,
        destination: l.destination,
        departDate: l.date,
        passengers: s.passengers,
        cabin: s.cabin,
        flexDays: 0,
        includeNearby: false,
      }));
    } else {
      if (!s.departDate) {
        setState({ error: "errorPickDate" });
        return;
      }
      payloads = [
        {
          origin: s.origin,
          destination: s.destination,
          departDate: s.departDate,
          returnDate: s.journeyType === "Roundtrip" ? s.returnDate : undefined,
          passengers: s.passengers,
          cabin: s.cabin,
          flexDays: s.flexDays,
          includeNearby: s.includeNearby,
          tripDaysMin: s.tripDaysEnabled && s.journeyType === "Roundtrip" ? Math.max(1, s.tripDays - s.tripDurationFlex) : undefined,
          tripDaysMax: s.tripDaysEnabled && s.journeyType === "Roundtrip" ? s.tripDays + s.tripDurationFlex : undefined,
        },
      ];
    }

    const startedAt = Date.now();
    setState({
      searching: true,
      phase: "scanning",
      deals: [],
      best: null,
      scanned: 0,
      error: null,
      statusLine: "Initializing route solver…",
      logLines: [
        "◇ Booting AirScout AI route solver…",
        "◇ Scanning 412 airlines across 6 alliances…",
      ],
    });

    const log = (line: string) =>
      setState({ logLines: [...getState().logLines, line].slice(-10) });
    const append = (offer: RankedOffer) =>
      setState({ deals: [...getState().deals, offer] });

    let totalScanned = 0;
    let bestOffer: RankedOffer | null = null;

    const consume = (event: FeedEvent) => {
      if (event.type === "status") {
        setState({ statusLine: event.detail });
        if (event.phase === "fetched" || event.phase === "reason" || event.phase === "init") {
          log(`▸ ${event.detail}`);
        }
      } else if (event.type === "deal") {
        append(event.offer);
      } else if (event.type === "summary") {
        totalScanned += event.scanned;
        if (event.best && (!bestOffer || event.best.priceTotal < bestOffer.priceTotal)) {
          bestOffer = event.best;
        }
        setState({ scanned: totalScanned, best: bestOffer, statusLine: `Locked ${totalScanned} fares.` });
        log(`✓ Cross-compared ${event.scanned} fares — ranking by price/hour`);
      } else if (event.type === "error") {
        setState({ error: event.message });
      }
    };

    try {
      for (const payload of payloads) {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok || !res.body) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || `Search failed (${res.status}).`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              consume(JSON.parse(line) as FeedEvent);
            } catch {
              // ignore partial/garbled line
            }
          }
        }
      }
    } catch (err) {
      setState({ searching: false, phase: "idle", error: (err as Error).message });
      return;
    }

    // Hold the animation for the full minimum duration before the reveal.
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_SCAN_MS) {
      await new Promise((r) => setTimeout(r, MIN_SCAN_MS - elapsed));
    }
    setState({ searching: false, phase: "results" });
  },
}));
