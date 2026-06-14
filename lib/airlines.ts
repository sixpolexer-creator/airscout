// Official international carrier roster with alliance + profile metadata.
// This is the relational backbone the mock generator and filters share.

export type AirlineCode =
  | "EK" | "QR" | "SQ" | "LH" | "BA" | "DL" | "LY" | "FR" | "W6" | "U2";

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
