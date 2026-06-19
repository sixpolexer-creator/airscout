// Scalable airline source configuration.
// Maps every Tier 1 IATA code to its best available integration method.
// Add new airlines here only — the core search engine never needs to change.
//
// Integration hierarchy (priority order):
//   direct   → live carrier adapter in lib/adapters/carriers/; gated by env var
//   duffel   → covered by the Duffel GDS aggregator (DUFFEL_TOKEN required)
//   mock-only→ appears in mock results only; no live data source yet
//
// Recommended path for airlines currently "mock-only":
//   1. Duffel (https://duffel.com) — covers 300+ airlines via NDC/IATA BSP
//   2. Amadeus Self-Service API (https://developers.amadeus.com) — broad global coverage
//   3. Airline's own NDC API if available (requires commercial agreement)
//   Do NOT implement undocumented website scraping — it is fragile and may violate ToS.

import type { AirlineCode } from "@/lib/airlines";

export type SourceType = "direct" | "duffel" | "mock-only";

export interface AirlineSource {
  iata: AirlineCode;
  sourceType: SourceType;
  adapterId?: string;  // id of the FlightAdapter, populated for "direct" sources
}

export const AIRLINE_SOURCE_REGISTRY: Record<AirlineCode, AirlineSource> = {
  // ── Direct adapters (live, gated by env vars) ─────────────────────────────
  LY: { iata: "LY", sourceType: "direct", adapterId: "el-al" },
  FR: { iata: "FR", sourceType: "direct", adapterId: "ryanair" },
  W6: { iata: "W6", sourceType: "direct", adapterId: "wizz-air" },
  FZ: { iata: "FZ", sourceType: "direct", adapterId: "flydubai" },

  // ── Duffel GDS — major IATA members covered by the aggregator ────────────
  // Activate by setting DUFFEL_TOKEN in your environment.
  EK: { iata: "EK", sourceType: "duffel" },
  QR: { iata: "QR", sourceType: "duffel" },
  EY: { iata: "EY", sourceType: "duffel" },
  SV: { iata: "SV", sourceType: "duffel" },
  LH: { iata: "LH", sourceType: "duffel" },
  LX: { iata: "LX", sourceType: "duffel" },
  OS: { iata: "OS", sourceType: "duffel" },
  SN: { iata: "SN", sourceType: "duffel" },
  LO: { iata: "LO", sourceType: "duffel" },
  BA: { iata: "BA", sourceType: "duffel" },
  IB: { iata: "IB", sourceType: "duffel" },
  AY: { iata: "AY", sourceType: "duffel" },
  AF: { iata: "AF", sourceType: "duffel" },
  KL: { iata: "KL", sourceType: "duffel" },
  TP: { iata: "TP", sourceType: "duffel" },
  SK: { iata: "SK", sourceType: "duffel" },
  EI: { iata: "EI", sourceType: "duffel" },
  TK: { iata: "TK", sourceType: "duffel" },
  A3: { iata: "A3", sourceType: "duffel" },
  U2: { iata: "U2", sourceType: "duffel" },
  AA: { iata: "AA", sourceType: "duffel" },
  DL: { iata: "DL", sourceType: "duffel" },
  UA: { iata: "UA", sourceType: "duffel" },
  AC: { iata: "AC", sourceType: "duffel" },
  AS: { iata: "AS", sourceType: "duffel" },
  B6: { iata: "B6", sourceType: "duffel" },
  AM: { iata: "AM", sourceType: "duffel" },
  CM: { iata: "CM", sourceType: "duffel" },
  LA: { iata: "LA", sourceType: "duffel" },
  AV: { iata: "AV", sourceType: "duffel" },
  SQ: { iata: "SQ", sourceType: "duffel" },
  CX: { iata: "CX", sourceType: "duffel" },
  NH: { iata: "NH", sourceType: "duffel" },
  JL: { iata: "JL", sourceType: "duffel" },
  KE: { iata: "KE", sourceType: "duffel" },
  OZ: { iata: "OZ", sourceType: "duffel" },
  BR: { iata: "BR", sourceType: "duffel" },
  CA: { iata: "CA", sourceType: "duffel" },
  MU: { iata: "MU", sourceType: "duffel" },
  TG: { iata: "TG", sourceType: "duffel" },
  MH: { iata: "MH", sourceType: "duffel" },
  AI: { iata: "AI", sourceType: "duffel" },
  QF: { iata: "QF", sourceType: "duffel" },
  NZ: { iata: "NZ", sourceType: "duffel" },

  // ── Mock-only — no live data source configured yet ─────────────────────
  // These airlines appear in mock results. Integrate via Duffel or NDC to go live.
  G9: { iata: "G9", sourceType: "mock-only" },
  WY: { iata: "WY", sourceType: "mock-only" },
  KU: { iata: "KU", sourceType: "mock-only" },
  GF: { iata: "GF", sourceType: "mock-only" },
  RJ: { iata: "RJ", sourceType: "mock-only" },
  ME: { iata: "ME", sourceType: "mock-only" },
  XY: { iata: "XY", sourceType: "mock-only" },
  MS: { iata: "MS", sourceType: "mock-only" },
  ET: { iata: "ET", sourceType: "mock-only" },
  AT: { iata: "AT", sourceType: "mock-only" },
  FI: { iata: "FI", sourceType: "mock-only" },
  JU: { iata: "JU", sourceType: "mock-only" },
  UX: { iata: "UX", sourceType: "mock-only" },
  VY: { iata: "VY", sourceType: "mock-only" },
  PC: { iata: "PC", sourceType: "mock-only" },
  BT: { iata: "BT", sourceType: "mock-only" },
  WS: { iata: "WS", sourceType: "mock-only" },
  HA: { iata: "HA", sourceType: "mock-only" },
  AR: { iata: "AR", sourceType: "mock-only" },
  G3: { iata: "G3", sourceType: "mock-only" },
  AD: { iata: "AD", sourceType: "mock-only" },
  CI: { iata: "CI", sourceType: "mock-only" },
  CZ: { iata: "CZ", sourceType: "mock-only" },
  HU: { iata: "HU", sourceType: "mock-only" },
  VN: { iata: "VN", sourceType: "mock-only" },
  GA: { iata: "GA", sourceType: "mock-only" },
  PR: { iata: "PR", sourceType: "mock-only" },
  UL: { iata: "UL", sourceType: "mock-only" },
  "6E": { iata: "6E", sourceType: "mock-only" },
  HY: { iata: "HY", sourceType: "mock-only" },
  VA: { iata: "VA", sourceType: "mock-only" },
  JQ: { iata: "JQ", sourceType: "mock-only" },
  IZ: { iata: "IZ", sourceType: "mock-only" },
  U8: { iata: "U8", sourceType: "mock-only" },
  "5F": { iata: "5F", sourceType: "mock-only" },
};

export function airlineSource(code: string): AirlineSource | undefined {
  return AIRLINE_SOURCE_REGISTRY[code as AirlineCode];
}
