import type { FlightAdapter } from "@/lib/adapters/types";
import type { FlightOffer, FlightSegment, SearchQuery } from "@/lib/types";
import { itineraryAlliance, itineraryCarrierType } from "@/lib/airlines";
import { parseIsoDuration, elapsedMinutes, layoverMinutes, browserHeaders } from "@/lib/adapters/carriers/utils";

const SITE_ORIGIN = "https://be.wizzair.com";
const API_URL = `${SITE_ORIGIN}/28.4.0/Api/search/timetable`;

// ── Raw response types ────────────────────────────────────────────────────────

interface WizzFlight {
  departureStation: string;
  arrivalStation: string;
  flightNumber: string;
  departureDate: string;  // ISO local datetime
  arrivalDate: string;    // ISO local datetime
  duration: string;       // ISO-8601 e.g. "PT2H20M"
  price: { amount: number; currencyCode: string };
  hasMacFlight: boolean;
}

interface WizzResponse {
  outboundFlights: WizzFlight[];
  returnFlights?: WizzFlight[];
}

// ── Normaliser ────────────────────────────────────────────────────────────────

function normaliseFlight(f: WizzFlight, query: SearchQuery): FlightOffer {
  const durationMin = parseIsoDuration(f.duration);
  // Wizz Air does not include UTC offset — append Z to treat as UTC for normalisation.
  const departUtc = f.departureDate.endsWith("Z") ? f.departureDate : `${f.departureDate}Z`;
  const arriveUtc = f.arrivalDate.endsWith("Z") ? f.arrivalDate : `${f.arrivalDate}Z`;
  const elapsed = elapsedMinutes(departUtc, arriveUtc) || durationMin;

  const seg: FlightSegment = {
    carrier: "Wizz Air",
    carrierCode: "W6",
    flightNumber: f.flightNumber,
    from: f.departureStation,
    to: f.arrivalStation,
    departUtc,
    arriveUtc,
    durationMin,
  };

  const priceTotal = Math.round(f.price.amount * query.passengers * 100) / 100;
  const taxes = Math.round(priceTotal * 0.18 * 100) / 100;

  return {
    id: `wizzair-${f.flightNumber}-${f.departureDate.slice(0, 10)}`,
    source: "wizz-air",
    segments: [seg],
    origin: query.origin,
    destination: query.destination,
    departDate: query.departDate,
    priceTotal,
    priceCurrency: f.price.currencyCode,
    baseFare: Math.round((priceTotal - taxes) * 100) / 100,
    taxes,
    baggageFee: 0,
    baggageIncluded: false,
    durationMin: elapsed,
    layoverMin: layoverMinutes([seg], elapsed),
    stops: 0,
    separateTickets: false,
    roundTrip: false,
    alliance: itineraryAlliance(["W6"]),
    carrierType: itineraryCarrierType(["W6"]),
    cabin: query.cabin,
  };
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export const wizzAirAdapter: FlightAdapter = {
  id: "wizz-air",
  label: "Wizz Air Direct",
  isAvailable: () => true,

  async search(query: SearchQuery): Promise<FlightOffer[]> {
    try {
      const body: Record<string, unknown> = {
        flightList: [
          {
            departureStation: query.origin,
            arrivalStation: query.destination,
            from: query.departDate,
            to: query.departDate,
          },
        ],
        priceType: "regular",
        adultCount: query.passengers,
        childCount: 0,
        infantCount: 0,
      };

      const headers: Record<string, string> = {
        ...browserHeaders(SITE_ORIGIN),
        "Content-Type": "application/json",
      };
      if (process.env.WIZZAIR_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.WIZZAIR_TOKEN}`;
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return [];

      const data = (await res.json()) as WizzResponse;
      return (data.outboundFlights ?? []).map((f) => normaliseFlight(f, query));
    } catch {
      return [];
    }
  },
};
