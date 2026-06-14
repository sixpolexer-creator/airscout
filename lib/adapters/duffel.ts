import type { FlightAdapter } from "@/lib/adapters/types";
import type { FlightOffer, FlightSegment, JourneyLeg, SearchQuery } from "@/lib/types";
import { itineraryAlliance, itineraryCarrierType } from "@/lib/airlines";

// Compliant live-data adapter for the Duffel API (https://duffel.com).
// This is the legitimate alternative to scraping airline portals: a licensed
// aggregator with a free test environment. Set DUFFEL_TOKEN to enable.
//
// It is disabled (isAvailable=false) until a token is present, so the app
// still runs end-to-end on the mock adapter with zero configuration.

const DUFFEL_URL = "https://api.duffel.com/air/offer_requests";

interface DuffelSlice {
  segments: {
    operating_carrier: { name: string; iata_code: string };
    marketing_carrier_flight_number: string;
    origin: { iata_code: string };
    destination: { iata_code: string };
    departing_at: string;
    arriving_at: string;
    duration: string; // ISO-8601 duration, e.g. "PT7H30M"
    aircraft?: { name: string } | null;
  }[];
}

interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  tax_amount: string | null;
  base_amount: string | null;
  slices: DuffelSlice[];
  passengers?: unknown[];
}

function parseIsoDuration(iso: string): number {
  // PT#H#M -> minutes
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!m) return 0;
  return (parseInt(m[1] || "0", 10) * 60) + parseInt(m[2] || "0", 10);
}

function sliceToSegments(slice: DuffelSlice): FlightSegment[] {
  return slice.segments.map((s) => ({
    carrier: s.operating_carrier.name,
    carrierCode: s.operating_carrier.iata_code,
    flightNumber: `${s.operating_carrier.iata_code}${s.marketing_carrier_flight_number}`,
    from: s.origin.iata_code,
    to: s.destination.iata_code,
    departUtc: s.departing_at,
    arriveUtc: s.arriving_at,
    durationMin: parseIsoDuration(s.duration),
    aircraft: s.aircraft?.name,
  }));
}

function elapsedFor(segments: FlightSegment[]): { air: number; elapsed: number } {
  const air = segments.reduce((a, s) => a + s.durationMin, 0);
  const first = new Date(segments[0].departUtc).getTime();
  const last = new Date(segments[segments.length - 1].arriveUtc).getTime();
  return { air, elapsed: Math.max(air, Math.round((last - first) / 60000)) };
}

function normalizeDuffelOffer(query: SearchQuery, offer: DuffelOffer): FlightOffer {
  const outSegments = sliceToSegments(offer.slices[0]);
  const out = elapsedFor(outSegments);
  const base = Math.round(parseFloat(offer.base_amount ?? offer.total_amount));
  const taxes = Math.round(parseFloat(offer.tax_amount ?? "0"));

  let inbound: JourneyLeg | undefined;
  if (offer.slices.length > 1 && query.returnDate) {
    const inSegments = sliceToSegments(offer.slices[1]);
    const inElapsed = elapsedFor(inSegments);
    inbound = {
      segments: inSegments,
      departDate: query.returnDate,
      durationMin: inElapsed.elapsed,
      layoverMin: Math.max(0, inElapsed.elapsed - inElapsed.air),
      stops: inSegments.length - 1,
    };
  }

  return {
    id: offer.id,
    source: "duffel",
    segments: outSegments,
    origin: query.origin,
    destination: query.destination,
    departDate: query.departDate,
    priceTotal: Math.round(parseFloat(offer.total_amount)),
    priceCurrency: offer.total_currency,
    baseFare: base,
    taxes,
    baggageFee: 0,
    baggageIncluded: true,
    durationMin: out.elapsed,
    layoverMin: Math.max(0, out.elapsed - out.air),
    stops: outSegments.length - 1,
    separateTickets: false,
    alliance: itineraryAlliance([...outSegments, ...(inbound?.segments ?? [])].map((s) => s.carrierCode)),
    carrierType: itineraryCarrierType([...outSegments, ...(inbound?.segments ?? [])].map((s) => s.carrierCode)),
    roundTrip: Boolean(inbound),
    inbound,
    cabin: query.cabin,
  };
}

export const duffelAdapter: FlightAdapter = {
  id: "duffel",
  label: "Duffel Live API",
  isAvailable: () => Boolean(process.env.DUFFEL_TOKEN),
  async search(query: SearchQuery): Promise<FlightOffer[]> {
    const token = process.env.DUFFEL_TOKEN;
    if (!token) return [];

    const slices = [
      { origin: query.origin, destination: query.destination, departure_date: query.departDate },
    ];
    if (query.returnDate) {
      slices.push({
        origin: query.destination,
        destination: query.origin,
        departure_date: query.returnDate,
      });
    }

    const res = await fetch(`${DUFFEL_URL}?return_offers=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Duffel-Version": "v2",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers: Array.from({ length: query.passengers }, () => ({ type: "adult" })),
          cabin_class: query.cabin,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Duffel API ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { data: { offers: DuffelOffer[] } };
    return json.data.offers.map((o) => normalizeDuffelOffer(query, o));
  },
};
