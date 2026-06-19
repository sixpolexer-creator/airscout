import type { FlightAdapter } from "@/lib/adapters/types";
import type { FlightOffer, FlightSegment, SearchQuery } from "@/lib/types";
import { itineraryAlliance, itineraryCarrierType } from "@/lib/airlines";
import { parseIsoDuration, elapsedMinutes, layoverMinutes, browserHeaders } from "@/lib/adapters/carriers/utils";

const SITE_ORIGIN = "https://booking.elal.com";
const API_URL = `${SITE_ORIGIN}/api/v3/flightavailability`;

// ── Raw response types ────────────────────────────────────────────────────────

interface ElAlSegment {
  flightNumber: string;
  from: string;
  to: string;
  departureTime: string;  // ISO-8601 UTC
  arrivalTime: string;    // ISO-8601 UTC
  duration: string;       // ISO-8601 e.g. "PT5H30M"
  aircraftType?: string;
}

interface ElAlFlight {
  flightId: string;
  segments: ElAlSegment[];
  price: {
    amount: number;
    currency: string;
    taxes: number;
    baseFare: number;
  };
  baggageIncluded: boolean;
}

interface ElAlResponse {
  outboundFlights: ElAlFlight[];
  inboundFlights?: ElAlFlight[];
}

// ── Normaliser ────────────────────────────────────────────────────────────────

const CABIN_MAP: Record<string, string> = {
  economy: "Y",
  premium_economy: "W",
  business: "C",
  first: "F",
};

function normaliseSegment(s: ElAlSegment): FlightSegment {
  return {
    carrier: "El Al",
    carrierCode: "LY",
    flightNumber: s.flightNumber,
    from: s.from,
    to: s.to,
    departUtc: s.departureTime,
    arriveUtc: s.arrivalTime,
    durationMin: parseIsoDuration(s.duration),
    aircraft: s.aircraftType,
  };
}

function normaliseFlight(
  flight: ElAlFlight,
  query: SearchQuery,
  inboundFlight?: ElAlFlight,
): FlightOffer {
  const segs = flight.segments.map(normaliseSegment);
  const elapsed = elapsedMinutes(segs[0].departUtc, segs[segs.length - 1].arriveUtc);
  const loverMin = layoverMinutes(segs, elapsed);
  const allCodes = segs.map((s) => s.carrierCode);

  let inbound: FlightOffer["inbound"];
  if (inboundFlight && query.returnDate) {
    const inSegs = inboundFlight.segments.map(normaliseSegment);
    const inElapsed = elapsedMinutes(inSegs[0].departUtc, inSegs[inSegs.length - 1].arriveUtc);
    inbound = {
      segments: inSegs,
      departDate: query.returnDate,
      durationMin: inElapsed,
      layoverMin: layoverMinutes(inSegs, inElapsed),
      stops: inSegs.length - 1,
    };
    allCodes.push(...inSegs.map((s) => s.carrierCode));
  }

  return {
    id: flight.flightId,
    source: "el-al",
    segments: segs,
    origin: query.origin,
    destination: query.destination,
    departDate: query.departDate,
    priceTotal: flight.price.amount,
    priceCurrency: flight.price.currency,
    baseFare: flight.price.baseFare,
    taxes: flight.price.taxes,
    baggageFee: 0,
    baggageIncluded: flight.baggageIncluded,
    durationMin: elapsed,
    layoverMin: loverMin,
    stops: segs.length - 1,
    separateTickets: false,
    roundTrip: Boolean(inbound),
    inbound,
    alliance: itineraryAlliance(allCodes),
    carrierType: itineraryCarrierType(allCodes),
    cabin: query.cabin,
  };
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export const elAlAdapter: FlightAdapter = {
  id: "el-al",
  label: "El Al Direct",
  isAvailable: () => Boolean(process.env.ELAL_ENABLED),

  async search(query: SearchQuery): Promise<FlightOffer[]> {
    try {
      const body: Record<string, unknown> = {
        Origin: query.origin,
        Destination: query.destination,
        DepartureDate: query.departDate,
        Adult: query.passengers,
        Child: 0,
        Infant: 0,
        CabinClass: CABIN_MAP[query.cabin] ?? "Y",
        DirectOnly: false,
        Currency: "USD",
      };
      if (query.returnDate) body.ReturnDate = query.returnDate;

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { ...browserHeaders(SITE_ORIGIN), "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return [];

      const data = (await res.json()) as ElAlResponse;
      const inbounds = data.inboundFlights ?? [];

      return (data.outboundFlights ?? []).map((f, i) =>
        normaliseFlight(f, query, inbounds[i]),
      );
    } catch {
      return [];
    }
  },
};
