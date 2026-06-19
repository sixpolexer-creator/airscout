/**
 * Macro-destination regions for the "Everywhere / Region" search feature.
 *
 * Each region ID maps to a curated set of major hubs. Fan-out search
 * sends one concurrent request per hub, so lists are intentionally capped
 * at ≤12 airports to keep the orchestrator's Promise.allSettled pool sane.
 *
 * REG_ALL ("Everywhere") uses a cross-regional representative sample
 * (top 3 per region = 21 total) rather than the full union.
 */

export const REGION_IDS = [
  "REG_ALL",
  "REG_EUR",
  "REG_MDE",
  "REG_AFR",
  "REG_ASI",
  "REG_NAM",
  "REG_SAM",
  "REG_OCE",
] as const;

export type RegionId = (typeof REGION_IDS)[number];

export interface MacroRegion {
  readonly id: RegionId;
  readonly label: string;
  /** Emoji icon shown in input display and dropdown. */
  readonly icon: string;
  /** Short description shown as dropdown subtitle. */
  readonly description: string;
}

// ---------------------------------------------------------------------------
// Hub IATA lists — ordered by traffic volume / booking relevance.
// ---------------------------------------------------------------------------

const HUBS: Readonly<Record<Exclude<RegionId, "REG_ALL">, readonly string[]>> = {
  REG_EUR: ["LHR", "CDG", "FRA", "AMS", "MAD", "FCO", "BCN", "MUC", "VIE", "ATH", "LIS", "WAW"],
  REG_MDE: ["DXB", "DOH", "IST", "AUH", "CAI", "AMM", "RUH", "TLV", "BEY", "KWI"],
  REG_AFR: ["CAI", "JNB", "NBO", "ADD", "LOS", "CMN", "CPT", "ACC", "TUN", "ABJ"],
  REG_ASI: ["SIN", "BKK", "NRT", "PEK", "HKG", "ICN", "KUL", "DEL", "PVG", "CGK"],
  REG_NAM: ["JFK", "LAX", "ORD", "DFW", "MIA", "YYZ", "SFO", "YVR", "BOS", "MEX"],
  REG_SAM: ["GRU", "EZE", "BOG", "SCL", "LIM", "GIG", "MVD", "BSB"],
  REG_OCE: ["SYD", "MEL", "AKL", "BNE", "PER", "ADL"],
};

// "Everywhere" = top 3 hubs from each region → 21 concurrent destinations.
const EVERYWHERE: readonly string[] = [
  "LHR", "CDG", "FRA",   // Europe
  "DXB", "DOH", "IST",   // Middle East
  "CAI", "JNB", "NBO",   // Africa
  "SIN", "NRT", "BKK",   // Asia
  "JFK", "LAX", "ORD",   // North America
  "GRU", "EZE", "BOG",   // South America
  "SYD", "MEL", "AKL",   // Oceania
];

// ---------------------------------------------------------------------------
// Public catalogue — drives the UI "Destinations" section.
// ---------------------------------------------------------------------------

export const MACRO_REGIONS: readonly MacroRegion[] = [
  { id: "REG_ALL", label: "Everywhere",    icon: "🌍", description: "All global destinations" },
  { id: "REG_EUR", label: "Europe",        icon: "🏛", description: "LHR · CDG · FRA · AMS + more" },
  { id: "REG_MDE", label: "Middle East",   icon: "🌙", description: "DXB · DOH · IST · TLV + more" },
  { id: "REG_AFR", label: "Africa",        icon: "🌍", description: "CAI · JNB · NBO · LOS + more" },
  { id: "REG_ASI", label: "Asia",          icon: "🌏", description: "SIN · BKK · NRT · PEK + more" },
  { id: "REG_NAM", label: "North America", icon: "🌎", description: "JFK · LAX · ORD · YYZ + more" },
  { id: "REG_SAM", label: "South America", icon: "🌎", description: "GRU · EZE · BOG · SCL + more" },
  { id: "REG_OCE", label: "Oceania",       icon: "🌏", description: "SYD · MEL · AKL · BNE + more" },
];

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Type guard — true when `s` is a valid RegionId string. */
export function isRegionId(s: string): s is RegionId {
  return (REGION_IDS as readonly string[]).includes(s);
}

/**
 * Expands a region ID to its constituent IATA hub codes.
 * REG_ALL returns a cross-regional representative sample (21 airports).
 */
export function expandRegion(id: RegionId): string[] {
  if (id === "REG_ALL") return [...EVERYWHERE];
  return [...HUBS[id]];
}

/** Returns the MacroRegion record for a given ID (always resolves). */
export function regionById(id: RegionId): MacroRegion {
  return MACRO_REGIONS.find((r) => r.id === id)!;
}
