// AirScout unified flight schema.
// Every adapter (mock, Duffel, Amadeus, ...) MUST normalize into these types.
// This is the single "data matrix" contract that all agents pass between each other.

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface SearchQuery {
  origin: string;        // IATA airport code, e.g. "JFK"
  destination: string;   // IATA airport or country-proxy code, e.g. "LHR"
  departDate: string;    // ISO date "YYYY-MM-DD"
  returnDate?: string;   // ISO date, omit for one-way
  passengers: number;    // adults
  cabin: CabinClass;
  flexDays: number;      // +/- N day window expansion (0 = exact dates)
  tripDays?: number;     // fixed stay length: scan full window but only return pairs where returnDate = departDate + tripDays
  maxStops?: number;     // optional ceiling on connections
  includeNearby?: boolean; // also scan alternate airports near the destination
}

export interface FlightSegment {
  carrier: string;        // marketing carrier name
  carrierCode: string;    // IATA airline code, e.g. "BA"
  flightNumber: string;   // e.g. "BA178"
  from: string;           // departure IATA
  to: string;             // arrival IATA
  departUtc: string;      // ISO 8601 with offset
  arriveUtc: string;      // ISO 8601 with offset
  durationMin: number;    // segment air time in minutes
  aircraft?: string;
}

// One directional journey (outbound or inbound), one or more segments.
export interface JourneyLeg {
  segments: FlightSegment[];
  departDate: string;      // ISO date this leg starts
  durationMin: number;     // elapsed minutes incl. layovers
  layoverMin: number;      // time spent connecting
  stops: number;           // number of connections
}

// One bookable itinerary (may be a "separate ticket" combination of legs,
// and may be round-trip when `inbound` is present).
export interface FlightOffer {
  id: string;
  source: string;          // adapter id that produced this offer
  segments: FlightSegment[]; // outbound segments
  origin: string;
  destination: string;     // actual arrival airport (may be an alternate)
  departDate: string;      // ISO date the journey starts
  priceTotal: number;      // all-in price for all passengers, both directions
  priceCurrency: string;
  baseFare: number;
  taxes: number;
  baggageFee: number;      // normalized: 0 if a checked bag is included
  baggageIncluded: boolean;
  durationMin: number;     // outbound elapsed door-to-door minutes incl. layovers
  layoverMin: number;      // outbound time spent connecting
  stops: number;           // outbound number of connections
  separateTickets: boolean; // true if itinerary stitches independent bookings
  roundTrip: boolean;       // true when an inbound leg is included
  inbound?: JourneyLeg;     // return journey, present iff roundTrip
  nearbyKm?: number;        // >0 when arrival airport differs from requested
  alliance: "Star Alliance" | "Oneworld" | "SkyTeam" | "None"; // rolled-up alliance
  carrierType: "Legacy" | "LCC";  // rolled-up carrier profile
  deepLink?: string;        // where a user would actually book
  cabin: CabinClass;
}

// What the reasoning brain emits per offer after ranking.
export interface RankedOffer extends FlightOffer {
  rank: number;
  // price-to-duration efficiency: lower is better (cost per hour of travel)
  efficiencyCoeff: number;
  savingsVsMedian: number;  // currency saved vs the median priced offer
  reasons: string[];        // human-readable why-this-is-good notes
  risk?: string;            // e.g. "self-transfer, short connection" warning
}

// Streamed events for the Live AI Deal Feed (NDJSON over the response body).
export type FeedEvent =
  | { type: "status"; phase: string; detail: string; at: number }
  | { type: "deal"; offer: RankedOffer; at: number }
  | { type: "summary"; best: RankedOffer | null; scanned: number; sources: string[]; at: number }
  | { type: "error"; message: string; at: number };
