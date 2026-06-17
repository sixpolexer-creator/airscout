import type { FlightAdapter } from "@/lib/adapters/types";
import type { FlightOffer, FlightSegment, SearchQuery } from "@/lib/types";
import { itineraryAlliance, itineraryCarrierType } from "@/lib/airlines";
import { parseIsoDuration, elapsedMinutes, layoverMinutes, browserHeaders } from "@/lib/adapters/carriers/utils";

const SITE_ORIGIN = "https://www.flydubai.com";
const API_URL = `${SITE_ORIGIN}/api/v2/flights/search`;

// ── Raw response types ────────────────────────────────────────────────────────

interface FzdLeg {
  flightNumber: string;
  from: string;
  to: string;
  departureDateTime: string;  // ISO local datetime
  arrivalDateTime: string;
  duration: string;           // ISO-8601 e.g. "PT2H30M"
  aircraft?: string;
}

interface FzdFlight {
  id: string;
  legs: FzdLeg[];
  price: {
    totalAmount: number;
    currency: string;
    baseFare: number;
    taxesAndFees: number;
  };
  freeBaggage: boolean;
}

interface FzdResponse {
  flights: FzdFlight[];
}

// ── Normaliser ────────────────────────────────────────────────────────────────

const CABIN_MAP: Record<string, string> = {
  economy: "Y",
  premium_economy: "W",
  business: "C",
  first: "C",  // flydubai has Business as top cabin
};

function normaliseLeg(leg: FzdLeg): FlightSegment {
  const departUtc = leg.departureDateTime.endsWith("Z")
    ? leg.departureDateTime
    : `${leg.departureDateTime}Z`;
  const arriveUtc = leg.arrivalDateTime.endsWith("Z")
    ? leg.arrivalDateTime
    : `${leg.arrivalDateTime}Z`;
  return {
    carrier: "flydubai",
    carrierCode: "FZ",
    flightNumber: leg.flightNumber,
    from: leg.from,
    to: leg.to,
    departUtc,
    arriveUtc,
    durationMin: parseIsoDuration(leg.duration),
    aircraft: leg.aircraft,
  };
}

function normaliseFlight(f: FzdFlight, query: SearchQuery): FlightOffer {
  const segs = f.legs.map(normaliseLeg);
  const elapsed = elapsedMinutes(segs[0].departUtc, segs[segs.length - 1].arriveUtc);
  return {
    id: f.id,
    source: "flydubai",
    segments: segs,
    origin: query.origin,
    destination: query.destination,
    departDate: query.departDate,
    priceTotal: f.price.totalAmount,
    priceCurrency: f.price.currency,
    baseFare: f.price.baseFare,
    taxes: f.price.taxesAndFees,
    baggageFee: 0,
    baggageIncluded: f.freeBaggage,
    durationMin: elapsed,
    layoverMin: layoverMinutes(segs, elapsed),
    stops: segs.length - 1,
    separateTickets: false,
    roundTrip: false,
    alliance: itineraryAlliance(segs.map((s) => s.carrierCode)),
    carrierType: itineraryCarrierType(segs.map((s) => s.carrierCode)),
    cabin: query.cabin,
  };
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export const flydubaiAdapter: FlightAdapter = {
  id: "flydubai",
  label: "flydubai Direct",
  isAvailable: () => true,

  async search(query: SearchQuery): Promise<FlightOffer[]> {
    try {
      const body: Record<string, unknown> = {
        from: query.origin,
        to: query.destination,
        departDate: query.departDate.replace(/-/g, ""),  // YYYYMMDD
        adults: query.passengers,
        children: 0,
        infants: 0,
        cabinClass: CABIN_MAP[query.cabin] ?? "Y",
        currency: "USD",
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { ...browserHeaders(SITE_ORIGIN), "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return [];

      const data = (await res.json()) as FzdResponse;
      return (data.flights ?? []).map((f) => normaliseFlight(f, query));
    } catch {
      return [];
    }
  },
};
