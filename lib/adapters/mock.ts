import type { FlightAdapter } from "@/lib/adapters/types";
import type { CabinClass, FlightOffer, FlightSegment, SearchQuery } from "@/lib/types";
import { AIRLINE_LIST, itineraryAlliance, itineraryCarrierType } from "@/lib/airlines";

// ---- Reference data -------------------------------------------------------

// Operating carriers come straight from the official roster so every generated
// segment carries a real alliance + carrier-profile identity.
const CARRIERS = AIRLINE_LIST.map((a) => ({ code: a.code, name: a.name, cheap: a.cheap }));

// Plausible connecting hubs by region (used to invent layover routes).
const HUBS = ["IST", "DUB", "CDG", "FRA", "AMS", "LIS", "BCN", "ATH", "DOH"];

const CABIN_MULT: Record<CabinClass, number> = {
  economy: 1,
  premium_economy: 1.7,
  business: 3.4,
  first: 6.2,
};

// ---- Deterministic pseudo-random (stable results per query) ---------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function addMinutesIso(date: string, minutesFromMidnight: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCMinutes(base.getUTCMinutes() + minutesFromMidnight);
  return base.toISOString();
}

// Approximate base air-time minutes between two airports from their codes.
function baseDuration(origin: string, destination: string, rng: () => number): number {
  const spread = hashString(origin + destination) % 600; // 0..599
  return 70 + spread + Math.floor(rng() * 60);
}

// ---- Offer factory --------------------------------------------------------

function makeSegment(
  rng: () => number,
  carrier: { code: string; name: string },
  from: string,
  to: string,
  date: string,
  departMinute: number,
  durationMin: number,
): FlightSegment {
  return {
    carrier: carrier.name,
    carrierCode: carrier.code,
    flightNumber: `${carrier.code}${100 + Math.floor(rng() * 8900)}`,
    from,
    to,
    departUtc: addMinutesIso(date, departMinute),
    arriveUtc: addMinutesIso(date, departMinute + durationMin),
    durationMin,
    aircraft: pick(rng, ["A320", "A321neo", "B738", "A350", "B789"]),
  };
}

function priceFor(
  rng: () => number,
  query: SearchQuery,
  airMin: number,
  carrierCheap: number,
  stops: number,
): { base: number; taxes: number; baggageFee: number; baggageIncluded: boolean } {
  const perMin = 0.55 + rng() * 0.30;
  let base = airMin * perMin * carrierCheap * CABIN_MULT[query.cabin];
  base *= 1 - stops * 0.10; // connections trade time for money
  base *= query.passengers;
  base = Math.max(90 * query.passengers, base);
  const taxes = base * (0.18 + rng() * 0.10);
  const baggageIncluded = rng() > 0.45;
  const baggageFee = baggageIncluded ? 0 : (30 + Math.floor(rng() * 55)) * query.passengers;
  return {
    base: Math.round(base),
    taxes: Math.round(taxes),
    baggageFee,
    baggageIncluded,
  };
}

interface BuiltItinerary {
  segments: FlightSegment[];
  air: number;
  layover: number;
  stops: number;
  separateTickets: boolean;
  avgCheap: number;
}

// Build one directional journey from `origin` to `destination` on `date`.
function buildItinerary(
  rng: () => number,
  query: SearchQuery,
  origin: string,
  destination: string,
  date: string,
): BuiltItinerary {
  const stopRoll = rng();
  const maxStops = query.maxStops ?? 2;
  let stops = stopRoll > 0.78 ? 2 : stopRoll > 0.4 ? 1 : 0;
  stops = Math.min(stops, maxStops);

  const firstCarrier = pick(rng, CARRIERS);
  const segments: FlightSegment[] = [];
  let cursor = 300 + Math.floor(rng() * 900); // depart between 05:00 and 20:00
  let from = origin;
  let air = 0;
  let layover = 0;
  let separateTickets = false;

  for (let leg = 0; leg <= stops; leg++) {
    const isLast = leg === stops;
    const to = isLast ? destination : pick(rng, HUBS);
    // Most connections stay on the same carrier (a single through-ticket);
    // only ~25% of connecting legs switch carriers (a separate-ticket combo).
    const legCarrier = leg === 0 || rng() > 0.25 ? firstCarrier : pick(rng, CARRIERS);
    if (legCarrier.code !== firstCarrier.code) separateTickets = true;
    const dur = Math.max(
      55,
      Math.round(baseDuration(from, to, rng) / (stops + 1)) + Math.floor(rng() * 40),
    );
    segments.push(makeSegment(rng, legCarrier, from, to, date, cursor, dur));
    air += dur;
    cursor += dur;
    if (!isLast) {
      const conn = 45 + Math.floor(rng() * 240); // 45min .. 4h45
      layover += conn;
      cursor += conn;
    }
    from = to;
  }

  const avgCheap =
    segments.reduce((acc, s) => {
      const c = CARRIERS.find((x) => x.code === s.carrierCode);
      return acc + (c ? c.cheap : 1);
    }, 0) / segments.length;

  return { segments, air, layover, stops, separateTickets, avgCheap };
}

function buildOffer(
  rng: () => number,
  query: SearchQuery,
  date: string,
  index: number,
): FlightOffer {
  const outbound = buildItinerary(rng, query, query.origin, query.destination, date);
  const outPricing = priceFor(rng, query, outbound.air, outbound.avgCheap, outbound.stops);

  let base = outPricing.base;
  let taxes = outPricing.taxes;
  let separateTickets = outbound.separateTickets;
  let inbound: BuiltItinerary | null = null;

  if (query.returnDate) {
    inbound = buildItinerary(rng, query, query.destination, query.origin, query.returnDate);
    const inPricing = priceFor(rng, query, inbound.air, inbound.avgCheap, inbound.stops);
    base += inPricing.base;
    taxes += inPricing.taxes;
    if (inbound.separateTickets) separateTickets = true;
  }

  // separate tickets are cheaper but riskier
  if (separateTickets) base = Math.round(base * 0.84);

  const priceTotal = base + taxes + outPricing.baggageFee;

  // Roll segment-level carriers up to itinerary alliance + profile.
  const allCodes = [
    ...outbound.segments.map((s) => s.carrierCode),
    ...(inbound ? inbound.segments.map((s) => s.carrierCode) : []),
  ];
  const alliance = itineraryAlliance(allCodes);
  const carrierType = itineraryCarrierType(allCodes);

  return {
    id: `mock-${date}-${index}-${outbound.segments[0].flightNumber}`,
    source: "mock",
    segments: outbound.segments,
    origin: query.origin,
    destination: query.destination,
    departDate: date,
    priceTotal,
    priceCurrency: "USD",
    baseFare: base,
    taxes,
    baggageFee: outPricing.baggageFee,
    baggageIncluded: outPricing.baggageIncluded,
    durationMin: outbound.air + outbound.layover,
    layoverMin: outbound.layover,
    stops: outbound.stops,
    separateTickets,
    alliance,
    carrierType,
    roundTrip: Boolean(inbound),
    inbound: inbound
      ? {
          segments: inbound.segments,
          departDate: query.returnDate as string,
          durationMin: inbound.air + inbound.layover,
          layoverMin: inbound.layover,
          stops: inbound.stops,
        }
      : undefined,
    deepLink: `https://example.com/book/${outbound.segments[0].flightNumber}`,
    cabin: query.cabin,
  };
}

// ---- Adapter --------------------------------------------------------------

export const mockAdapter: FlightAdapter = {
  id: "mock",
  label: "AirScout Mock Inventory",
  isAvailable: () => true,
  async search(query: SearchQuery): Promise<FlightOffer[]> {
    // Simulate network/inventory latency so the live feed feels real.
    await new Promise((r) => setTimeout(r, 120 + Math.floor(Math.random() * 180)));
    const seed = hashString(
      `${query.origin}|${query.destination}|${query.departDate}|${query.returnDate ?? "ow"}|${query.cabin}|${query.passengers}`,
    );
    const rng = mulberry32(seed);
    const count = 10 + Math.floor(rng() * 9);
    const offers: FlightOffer[] = [];
    for (let i = 0; i < count; i++) {
      offers.push(buildOffer(rng, query, query.departDate, i));
    }
    return offers;
  },
};
