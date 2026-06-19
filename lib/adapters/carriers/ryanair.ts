import type { FlightAdapter } from "@/lib/adapters/types";
import type { FlightOffer, FlightSegment, SearchQuery } from "@/lib/types";
import { itineraryAlliance, itineraryCarrierType } from "@/lib/airlines";
import { parseHHMM, layoverMinutes, browserHeaders } from "@/lib/adapters/carriers/utils";

const SITE_ORIGIN = "https://www.ryanair.com";
const API_BASE = `${SITE_ORIGIN}/api/booking/v4/en-gb/availability`;

// ── Raw response types ────────────────────────────────────────────────────────

interface RyanairSegment {
  segmentNr: number;
  origin: string;
  destination: string;
  flightNumber: string;       // e.g. "FR 1234"
  time: [string, string];     // local [depart, arrive]
  timeUTC: [string, string];  // UTC [depart, arrive]
  duration: string;           // e.g. "0002:30"
}

interface RyanairFlight {
  flightKey: string;
  segments: RyanairSegment[];
  regularFare?: {
    fares: Array<{ type: string; amount: number; count: number }>;
  };
}

interface RyanairResponse {
  currency: string;
  trips: Array<{
    origin: string;
    destination: string;
    dates: Array<{
      dateOut: string;
      flights: RyanairFlight[];
    }>;
  }>;
}

// ── Normaliser ────────────────────────────────────────────────────────────────

function normaliseSegment(s: RyanairSegment): FlightSegment {
  const durationMin = parseHHMM(s.duration);
  return {
    carrier: "Ryanair",
    carrierCode: "FR",
    flightNumber: s.flightNumber.replace(" ", ""),  // "FR 1234" → "FR1234"
    from: s.origin,
    to: s.destination,
    departUtc: s.timeUTC[0],
    arriveUtc: s.timeUTC[1],
    durationMin,
  };
}

function normaliseFlight(
  flight: RyanairFlight,
  currency: string,
  query: SearchQuery,
): FlightOffer | null {
  if (!flight.regularFare) return null;

  const adtFare = flight.regularFare.fares.find((f) => f.type === "ADT");
  if (!adtFare) return null;

  const segs = flight.segments
    .sort((a, b) => a.segmentNr - b.segmentNr)
    .map(normaliseSegment);
  const totalAir = segs.reduce((a, s) => a + s.durationMin, 0);
  const loverMin = layoverMinutes(segs, totalAir);
  const priceTotal = Math.round(adtFare.amount * query.passengers * 100) / 100;
  const taxes = Math.round(priceTotal * 0.20 * 100) / 100;

  return {
    id: flight.flightKey,
    source: "ryanair",
    segments: segs,
    origin: query.origin,
    destination: query.destination,
    departDate: query.departDate,
    priceTotal,
    priceCurrency: currency,
    baseFare: Math.round((priceTotal - taxes) * 100) / 100,
    taxes,
    baggageFee: 0,
    baggageIncluded: false,  // Ryanair charges for checked bags by default
    durationMin: totalAir,
    layoverMin: loverMin,
    stops: segs.length - 1,
    separateTickets: false,
    roundTrip: false,
    alliance: itineraryAlliance(segs.map((s) => s.carrierCode)),
    carrierType: itineraryCarrierType(segs.map((s) => s.carrierCode)),
    cabin: query.cabin,
  };
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export const ryanairAdapter: FlightAdapter = {
  id: "ryanair",
  label: "Ryanair Direct",
  isAvailable: () => true,

  async search(query: SearchQuery): Promise<FlightOffer[]> {
    try {
      const params = new URLSearchParams({
        ADT: String(query.passengers),
        TEEN: "0",
        CHD: "0",
        INF: "0",
        Origin: query.origin,
        Destination: query.destination,
        DateOut: query.departDate,
        IncludeConnectingFlights: "false",
        ToUs: "AGREED",
        RoundTrip: "false",
        FlexDaysBeforeOut: "0",
        FlexDaysOut: "0",
      });

      const res = await fetch(`${API_BASE}?${params}`, {
        headers: browserHeaders(SITE_ORIGIN),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return [];

      const data = (await res.json()) as RyanairResponse;
      const offers: FlightOffer[] = [];

      for (const trip of data.trips ?? []) {
        for (const date of trip.dates ?? []) {
          for (const flight of date.flights ?? []) {
            const offer = normaliseFlight(flight, data.currency, query);
            if (offer) offers.push(offer);
          }
        }
      }
      return offers;
    } catch {
      return [];
    }
  },
};
