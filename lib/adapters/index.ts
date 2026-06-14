import type { FlightAdapter } from "@/lib/adapters/types";
import { mockAdapter } from "@/lib/adapters/mock";
import { duffelAdapter } from "@/lib/adapters/duffel";

// Registry of all known data sources. Order is priority, highest first.
const ALL_ADAPTERS: FlightAdapter[] = [duffelAdapter, mockAdapter];

// Active adapters = those usable in the current environment.
// Mock is always available, so the engine never returns an empty result set.
export function activeAdapters(): FlightAdapter[] {
  const live = ALL_ADAPTERS.filter((a) => a.isAvailable());
  return live.length > 0 ? live : [mockAdapter];
}
