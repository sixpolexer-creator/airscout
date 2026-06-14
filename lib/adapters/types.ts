import type { FlightOffer, SearchQuery } from "@/lib/types";

// Every data source implements this. The engine is source-agnostic:
// swapping mock -> Duffel -> Amadeus requires only a new FlightAdapter.
export interface FlightAdapter {
  id: string;
  label: string;
  // Returns offers ALREADY normalized into the unified FlightOffer schema.
  search(query: SearchQuery): Promise<FlightOffer[]>;
  // Whether this adapter is usable in the current environment (e.g. has keys).
  isAvailable(): boolean;
}
