// Official international carrier roster with alliance + profile metadata.
// This is the relational backbone the mock generator and filters share.

export type AirlineCode =
  | "EK" | "QR" | "SQ" | "LH" | "BA" | "DL" | "LY" | "FR" | "W6" | "U2"
  | "EY" | "FZ" | "SV" | "IZ" | "U8" | "LO" | "5F" | "HY" | "AA" | "CM" | "CX" | "6E" | "QF";

export type Alliance = "Star Alliance" | "Oneworld" | "SkyTeam" | "None";
export type CarrierType = "Legacy" | "LCC";

export interface Airline {
  code: AirlineCode;
  name: string;
  alliance: Alliance;
  carrierType: CarrierType;
  hub: string;        // primary hub IATA (display only)
  cheap: number;      // relative fare multiplier used by the mock pricer
}

export const AIRLINES: Record<AirlineCode, Airline> = {
  EK: { code: "EK", name: "Emirates",          alliance: "None",          carrierType: "Legacy", hub: "DXB", cheap: 1.08 },
  QR: { code: "QR", name: "Qatar Airways",      alliance: "Oneworld",      carrierType: "Legacy", hub: "DOH", cheap: 1.10 },
  SQ: { code: "SQ", name: "Singapore Airlines", alliance: "Star Alliance", carrierType: "Legacy", hub: "SIN", cheap: 1.12 },
  LH: { code: "LH", name: "Lufthansa",          alliance: "Star Alliance", carrierType: "Legacy", hub: "FRA", cheap: 1.02 },
  BA: { code: "BA", name: "British Airways",    alliance: "Oneworld",      carrierType: "Legacy", hub: "LHR", cheap: 1.00 },
  DL: { code: "DL", name: "Delta Air Lines",    alliance: "SkyTeam",       carrierType: "Legacy", hub: "JFK", cheap: 1.04 },
  LY: { code: "LY", name: "El Al",              alliance: "None",          carrierType: "Legacy", hub: "TLV", cheap: 1.06 },
  FR: { code: "FR", name: "Ryanair",            alliance: "None",          carrierType: "LCC",    hub: "DUB", cheap: 0.60 },
  W6: { code: "W6", name: "Wizz Air",           alliance: "None",          carrierType: "LCC",    hub: "BUD", cheap: 0.63 },
  U2: { code: "U2", name: "easyJet",            alliance: "None",          carrierType: "LCC",    hub: "LTN", cheap: 0.67 },
  // New carriers sourced from Intel Hub directory
  EY: { code: "EY", name: "Etihad Airways",      alliance: "None",          carrierType: "Legacy", hub: "AUH", cheap: 1.06 },
  FZ: { code: "FZ", name: "flydubai",            alliance: "None",          carrierType: "LCC",    hub: "DXB", cheap: 0.68 },
  SV: { code: "SV", name: "Saudia",              alliance: "SkyTeam",       carrierType: "Legacy", hub: "JED", cheap: 0.97 },
  IZ: { code: "IZ", name: "Air Haifa",           alliance: "None",          carrierType: "Legacy", hub: "HFA", cheap: 0.75 },
  U8: { code: "U8", name: "TUS Airways",         alliance: "None",          carrierType: "Legacy", hub: "LCA", cheap: 0.82 },
  LO: { code: "LO", name: "LOT Polish Airlines", alliance: "Star Alliance", carrierType: "Legacy", hub: "WAW", cheap: 1.00 },
  "5F": { code: "5F", name: "FlyOne",            alliance: "None",          carrierType: "LCC",    hub: "KIV", cheap: 0.64 },
  HY: { code: "HY", name: "Uzbekistan Airways",  alliance: "None",          carrierType: "Legacy", hub: "TAS", cheap: 0.88 },
  AA: { code: "AA", name: "American Airlines",   alliance: "Oneworld",      carrierType: "Legacy", hub: "DFW", cheap: 1.03 },
  CM: { code: "CM", name: "Copa Airlines",       alliance: "Star Alliance", carrierType: "Legacy", hub: "PTY", cheap: 0.99 },
  CX: { code: "CX", name: "Cathay Pacific",      alliance: "Oneworld",      carrierType: "Legacy", hub: "HKG", cheap: 1.13 },
  "6E": { code: "6E", name: "IndiGo",            alliance: "None",          carrierType: "LCC",    hub: "DEL", cheap: 0.61 },
  QF: { code: "QF", name: "Qantas",              alliance: "Oneworld",      carrierType: "Legacy", hub: "SYD", cheap: 1.09 },
};

export const AIRLINE_LIST: Airline[] = Object.values(AIRLINES);

export const ALLIANCES: Alliance[] = ["Star Alliance", "Oneworld", "SkyTeam", "None"];

export function airlineByCode(code: string): Airline | undefined {
  return AIRLINES[code as AirlineCode];
}

// Roll up segment-level carriers into an itinerary-level alliance:
// a shared non-None alliance across all segments, else "None" (mixed/unallied).
export function itineraryAlliance(codes: string[]): Alliance {
  const alliances = codes
    .map((c) => airlineByCode(c)?.alliance)
    .filter((a): a is Alliance => Boolean(a));
  if (alliances.length === 0) return "None";
  const first = alliances[0];
  if (first === "None") return "None";
  return alliances.every((a) => a === first) ? first : "None";
}

// An itinerary counts as LCC only if every operating segment is low-cost.
export function itineraryCarrierType(codes: string[]): CarrierType {
  const allLcc = codes.length > 0 && codes.every((c) => airlineByCode(c)?.carrierType === "LCC");
  return allLcc ? "LCC" : "Legacy";
}
