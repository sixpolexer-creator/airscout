import type { FlightAdapter } from "@/lib/adapters/types";
import { mockAdapter } from "@/lib/adapters/mock";
import { duffelAdapter } from "@/lib/adapters/duffel";
import { elAlAdapter } from "@/lib/adapters/carriers/el-al";
import { ryanairAdapter } from "@/lib/adapters/carriers/ryanair";
import { wizzAirAdapter } from "@/lib/adapters/carriers/wizz-air";
import { flydubaiAdapter } from "@/lib/adapters/carriers/flydubai";

// Registry of all known data sources. Order is priority, highest first.
// Direct-carrier adapters are listed before the Duffel aggregator so that
// native fares take precedence; Duffel fills gaps where no direct API exists.
const ALL_ADAPTERS: FlightAdapter[] = [
  elAlAdapter,
  ryanairAdapter,
  wizzAirAdapter,
  flydubaiAdapter,
  duffelAdapter,
  mockAdapter,
];

// Active adapters = those usable in the current environment.
// Mock is always available, so the engine never returns an empty result set.
export function activeAdapters(): FlightAdapter[] {
  const live = ALL_ADAPTERS.filter((a) => a.isAvailable());
  return live.length > 0 ? live : [mockAdapter];
}
