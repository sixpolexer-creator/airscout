// Official international carrier roster with alliance + profile metadata.
// This is the relational backbone the mock generator and filters share.

export type AirlineCode =
  // Middle East & Africa
  | "EK" | "QR" | "EY" | "FZ" | "SV" | "G9" | "WY" | "KU" | "GF" | "RJ"
  | "ME" | "XY" | "MS" | "ET" | "AT"
  // Europe
  | "LH" | "LX" | "OS" | "SN" | "LO" | "BA" | "IB" | "AY" | "AF" | "KL"
  | "TP" | "SK" | "EI" | "FI" | "TK" | "A3" | "JU" | "UX" | "FR" | "W6"
  | "U2" | "VY" | "PC" | "BT"
  // North America
  | "AA" | "DL" | "UA" | "AC" | "AS" | "B6" | "WS" | "AM" | "HA"
  // South & Central America
  | "CM" | "LA" | "AV" | "AR" | "G3" | "AD"
  // Asia
  | "SQ" | "CX" | "NH" | "JL" | "KE" | "OZ" | "BR" | "CI" | "CA" | "MU"
  | "CZ" | "HU" | "TG" | "VN" | "MH" | "GA" | "PR" | "AI" | "UL" | "6E" | "HY"
  // Oceania
  | "QF" | "NZ" | "VA" | "JQ"
  // Special Regional (Israel & surrounds)
  | "LY" | "IZ" | "U8" | "5F";

export type Alliance = "Star Alliance" | "Oneworld" | "SkyTeam" | "None";
export type CarrierType = "Legacy" | "LCC";

export interface Airline {
  code: AirlineCode;
  name: string;
  alliance: Alliance;
  carrierType: CarrierType;
  hub: string;        // primary hub IATA (display only)
  cheap: number;      // relative fare multiplier used by the mock pricer
  icao?: string;      // ICAO airline designator
  country?: string;   // country of registration
  region?: string;    // geographic region
  website?: string;   // official direct booking website
}

export const AIRLINES: Record<AirlineCode, Airline> = {
  // ── Middle East & Africa ──────────────────────────────────────────────────
  EK: { code: "EK", name: "Emirates",              alliance: "None",          carrierType: "Legacy", hub: "DXB", cheap: 1.08, icao: "UAE", country: "United Arab Emirates", region: "Middle East",    website: "https://www.emirates.com" },
  QR: { code: "QR", name: "Qatar Airways",         alliance: "Oneworld",      carrierType: "Legacy", hub: "DOH", cheap: 1.10, icao: "QTR", country: "Qatar",                region: "Middle East",    website: "https://www.qatarairways.com" },
  EY: { code: "EY", name: "Etihad Airways",        alliance: "None",          carrierType: "Legacy", hub: "AUH", cheap: 1.06, icao: "ETD", country: "United Arab Emirates", region: "Middle East",    website: "https://www.etihad.com" },
  FZ: { code: "FZ", name: "flydubai",              alliance: "None",          carrierType: "LCC",    hub: "DXB", cheap: 0.68, icao: "FDB", country: "United Arab Emirates", region: "Middle East",    website: "https://www.flydubai.com" },
  SV: { code: "SV", name: "Saudia",                alliance: "SkyTeam",       carrierType: "Legacy", hub: "JED", cheap: 0.97, icao: "SVA", country: "Saudi Arabia",         region: "Middle East",    website: "https://www.saudia.com" },
  G9: { code: "G9", name: "Air Arabia",            alliance: "None",          carrierType: "LCC",    hub: "SHJ", cheap: 0.62, icao: "ABY", country: "United Arab Emirates", region: "Middle East",    website: "https://www.airarabia.com" },
  WY: { code: "WY", name: "Oman Air",              alliance: "None",          carrierType: "Legacy", hub: "MCT", cheap: 0.92, icao: "OAS", country: "Oman",                 region: "Middle East",    website: "https://www.omanair.com" },
  KU: { code: "KU", name: "Kuwait Airways",        alliance: "None",          carrierType: "Legacy", hub: "KWI", cheap: 0.89, icao: "KAC", country: "Kuwait",               region: "Middle East",    website: "https://www.kuwaitairways.com" },
  GF: { code: "GF", name: "Gulf Air",              alliance: "None",          carrierType: "Legacy", hub: "BAH", cheap: 0.91, icao: "GFA", country: "Bahrain",              region: "Middle East",    website: "https://www.gulfair.com" },
  RJ: { code: "RJ", name: "Royal Jordanian",       alliance: "Oneworld",      carrierType: "Legacy", hub: "AMM", cheap: 0.88, icao: "RJA", country: "Jordan",               region: "Middle East",    website: "https://www.rj.com" },
  ME: { code: "ME", name: "Middle East Airlines",  alliance: "SkyTeam",       carrierType: "Legacy", hub: "BEY", cheap: 0.90, icao: "MEA", country: "Lebanon",              region: "Middle East",    website: "https://www.mea.com.lb" },
  XY: { code: "XY", name: "flynas",                alliance: "None",          carrierType: "LCC",    hub: "RUH", cheap: 0.65, icao: "KNE", country: "Saudi Arabia",         region: "Middle East",    website: "https://www.flynas.com" },
  MS: { code: "MS", name: "EgyptAir",              alliance: "Star Alliance", carrierType: "Legacy", hub: "CAI", cheap: 0.86, icao: "MSR", country: "Egypt",                region: "Africa",         website: "https://www.egyptair.com" },
  ET: { code: "ET", name: "Ethiopian Airlines",    alliance: "Star Alliance", carrierType: "Legacy", hub: "ADD", cheap: 0.85, icao: "ETH", country: "Ethiopia",             region: "Africa",         website: "https://www.ethiopianairlines.com" },
  AT: { code: "AT", name: "Royal Air Maroc",       alliance: "Oneworld",      carrierType: "Legacy", hub: "CMN", cheap: 0.87, icao: "RAM", country: "Morocco",              region: "Africa",         website: "https://www.royalairmaroc.com" },
  // ── Europe ───────────────────────────────────────────────────────────────
  LH: { code: "LH", name: "Lufthansa",             alliance: "Star Alliance", carrierType: "Legacy", hub: "FRA", cheap: 1.02, icao: "DLH", country: "Germany",              region: "Europe",         website: "https://www.lufthansa.com" },
  LX: { code: "LX", name: "SWISS",                 alliance: "Star Alliance", carrierType: "Legacy", hub: "ZRH", cheap: 1.05, icao: "SWR", country: "Switzerland",          region: "Europe",         website: "https://www.swiss.com" },
  OS: { code: "OS", name: "Austrian Airlines",     alliance: "Star Alliance", carrierType: "Legacy", hub: "VIE", cheap: 1.01, icao: "AUA", country: "Austria",              region: "Europe",         website: "https://www.austrian.com" },
  SN: { code: "SN", name: "Brussels Airlines",     alliance: "Star Alliance", carrierType: "Legacy", hub: "BRU", cheap: 0.98, icao: "BEL", country: "Belgium",              region: "Europe",         website: "https://www.brusselsairlines.com" },
  LO: { code: "LO", name: "LOT Polish Airlines",   alliance: "Star Alliance", carrierType: "Legacy", hub: "WAW", cheap: 1.00, icao: "LOT", country: "Poland",               region: "Europe",         website: "https://www.lot.com" },
  BA: { code: "BA", name: "British Airways",       alliance: "Oneworld",      carrierType: "Legacy", hub: "LHR", cheap: 1.00, icao: "BAW", country: "United Kingdom",       region: "Europe",         website: "https://www.britishairways.com" },
  IB: { code: "IB", name: "Iberia",                alliance: "Oneworld",      carrierType: "Legacy", hub: "MAD", cheap: 0.99, icao: "IBE", country: "Spain",                region: "Europe",         website: "https://www.iberia.com" },
  AY: { code: "AY", name: "Finnair",               alliance: "Oneworld",      carrierType: "Legacy", hub: "HEL", cheap: 1.00, icao: "FIN", country: "Finland",              region: "Europe",         website: "https://www.finnair.com" },
  AF: { code: "AF", name: "Air France",            alliance: "SkyTeam",       carrierType: "Legacy", hub: "CDG", cheap: 1.03, icao: "AFR", country: "France",               region: "Europe",         website: "https://www.airfrance.com" },
  KL: { code: "KL", name: "KLM",                   alliance: "SkyTeam",       carrierType: "Legacy", hub: "AMS", cheap: 1.01, icao: "KLM", country: "Netherlands",          region: "Europe",         website: "https://www.klm.com" },
  TP: { code: "TP", name: "TAP Air Portugal",      alliance: "Star Alliance", carrierType: "Legacy", hub: "LIS", cheap: 0.97, icao: "TAP", country: "Portugal",             region: "Europe",         website: "https://www.flytap.com" },
  SK: { code: "SK", name: "Scandinavian Airlines", alliance: "Star Alliance", carrierType: "Legacy", hub: "ARN", cheap: 1.00, icao: "SAS", country: "Sweden",               region: "Europe",         website: "https://www.flysas.com" },
  EI: { code: "EI", name: "Aer Lingus",            alliance: "Oneworld",      carrierType: "Legacy", hub: "DUB", cheap: 0.85, icao: "EIN", country: "Ireland",              region: "Europe",         website: "https://www.aerlingus.com" },
  FI: { code: "FI", name: "Icelandair",            alliance: "None",          carrierType: "Legacy", hub: "KEF", cheap: 0.92, icao: "ICE", country: "Iceland",              region: "Europe",         website: "https://www.icelandair.com" },
  TK: { code: "TK", name: "Turkish Airlines",      alliance: "Star Alliance", carrierType: "Legacy", hub: "IST", cheap: 0.95, icao: "THY", country: "Turkey",               region: "Europe",         website: "https://www.turkishairlines.com" },
  A3: { code: "A3", name: "Aegean Airlines",       alliance: "Star Alliance", carrierType: "Legacy", hub: "ATH", cheap: 0.91, icao: "AEE", country: "Greece",               region: "Europe",         website: "https://www.aegeanair.com" },
  JU: { code: "JU", name: "Air Serbia",            alliance: "None",          carrierType: "Legacy", hub: "BEG", cheap: 0.86, icao: "ASL", country: "Serbia",               region: "Europe",         website: "https://www.airserbia.com" },
  UX: { code: "UX", name: "Air Europa",            alliance: "SkyTeam",       carrierType: "Legacy", hub: "MAD", cheap: 0.93, icao: "AEA", country: "Spain",                region: "Europe",         website: "https://www.aireuropa.com" },
  FR: { code: "FR", name: "Ryanair",               alliance: "None",          carrierType: "LCC",    hub: "DUB", cheap: 0.60, icao: "RYR", country: "Ireland",              region: "Europe",         website: "https://www.ryanair.com" },
  W6: { code: "W6", name: "Wizz Air",              alliance: "None",          carrierType: "LCC",    hub: "BUD", cheap: 0.63, icao: "WZZ", country: "Hungary",              region: "Europe",         website: "https://www.wizzair.com" },
  U2: { code: "U2", name: "easyJet",               alliance: "None",          carrierType: "LCC",    hub: "LTN", cheap: 0.67, icao: "EZY", country: "United Kingdom",       region: "Europe",         website: "https://www.easyjet.com" },
  VY: { code: "VY", name: "Vueling",               alliance: "None",          carrierType: "LCC",    hub: "BCN", cheap: 0.70, icao: "VLG", country: "Spain",                region: "Europe",         website: "https://www.vueling.com" },
  PC: { code: "PC", name: "Pegasus Airlines",      alliance: "None",          carrierType: "LCC",    hub: "SAW", cheap: 0.63, icao: "PGT", country: "Turkey",               region: "Europe",         website: "https://www.flypgs.com" },
  BT: { code: "BT", name: "airBaltic",             alliance: "None",          carrierType: "Legacy", hub: "RIX", cheap: 0.88, icao: "BTI", country: "Latvia",               region: "Europe",         website: "https://www.airbaltic.com" },
  // ── North America ─────────────────────────────────────────────────────────
  AA: { code: "AA", name: "American Airlines",     alliance: "Oneworld",      carrierType: "Legacy", hub: "DFW", cheap: 1.03, icao: "AAL", country: "United States",        region: "North America",  website: "https://www.aa.com" },
  DL: { code: "DL", name: "Delta Air Lines",       alliance: "SkyTeam",       carrierType: "Legacy", hub: "JFK", cheap: 1.04, icao: "DAL", country: "United States",        region: "North America",  website: "https://www.delta.com" },
  UA: { code: "UA", name: "United Airlines",       alliance: "Star Alliance", carrierType: "Legacy", hub: "EWR", cheap: 1.02, icao: "UAL", country: "United States",        region: "North America",  website: "https://www.united.com" },
  AC: { code: "AC", name: "Air Canada",            alliance: "Star Alliance", carrierType: "Legacy", hub: "YYZ", cheap: 1.04, icao: "ACA", country: "Canada",               region: "North America",  website: "https://www.aircanada.com" },
  AS: { code: "AS", name: "Alaska Airlines",       alliance: "Oneworld",      carrierType: "Legacy", hub: "SEA", cheap: 0.96, icao: "ASA", country: "United States",        region: "North America",  website: "https://www.alaskaair.com" },
  B6: { code: "B6", name: "JetBlue",               alliance: "None",          carrierType: "LCC",    hub: "BOS", cheap: 0.78, icao: "JBU", country: "United States",        region: "North America",  website: "https://www.jetblue.com" },
  WS: { code: "WS", name: "WestJet",               alliance: "None",          carrierType: "LCC",    hub: "YYC", cheap: 0.82, icao: "WJA", country: "Canada",               region: "North America",  website: "https://www.westjet.com" },
  AM: { code: "AM", name: "Aeromexico",            alliance: "SkyTeam",       carrierType: "Legacy", hub: "MEX", cheap: 0.92, icao: "AMX", country: "Mexico",               region: "North America",  website: "https://www.aeromexico.com" },
  HA: { code: "HA", name: "Hawaiian Airlines",     alliance: "None",          carrierType: "Legacy", hub: "HNL", cheap: 0.94, icao: "HAL", country: "United States",        region: "North America",  website: "https://www.hawaiianairlines.com" },
  // ── South & Central America ───────────────────────────────────────────────
  CM: { code: "CM", name: "Copa Airlines",         alliance: "Star Alliance", carrierType: "Legacy", hub: "PTY", cheap: 0.99, icao: "CMP", country: "Panama",               region: "Central America", website: "https://www.copaair.com" },
  LA: { code: "LA", name: "LATAM Airlines",        alliance: "None",          carrierType: "Legacy", hub: "SCL", cheap: 0.91, icao: "LAN", country: "Chile",                region: "South America",  website: "https://www.latamairlines.com" },
  AV: { code: "AV", name: "Avianca",               alliance: "Star Alliance", carrierType: "Legacy", hub: "BOG", cheap: 0.88, icao: "AVA", country: "Colombia",             region: "South America",  website: "https://www.avianca.com" },
  AR: { code: "AR", name: "Aerolineas Argentinas", alliance: "SkyTeam",       carrierType: "Legacy", hub: "EZE", cheap: 0.86, icao: "ARG", country: "Argentina",            region: "South America",  website: "https://www.aerolineas.com.ar" },
  G3: { code: "G3", name: "GOL Airlines",          alliance: "None",          carrierType: "LCC",    hub: "GRU", cheap: 0.72, icao: "GLO", country: "Brazil",               region: "South America",  website: "https://www.voegol.com.br" },
  AD: { code: "AD", name: "Azul Brazilian Airlines", alliance: "None",        carrierType: "LCC",    hub: "VCP", cheap: 0.74, icao: "AZU", country: "Brazil",               region: "South America",  website: "https://www.voeazul.com.br" },
  // ── Asia ──────────────────────────────────────────────────────────────────
  SQ: { code: "SQ", name: "Singapore Airlines",    alliance: "Star Alliance", carrierType: "Legacy", hub: "SIN", cheap: 1.12, icao: "SIA", country: "Singapore",            region: "Asia",           website: "https://www.singaporeair.com" },
  CX: { code: "CX", name: "Cathay Pacific",        alliance: "Oneworld",      carrierType: "Legacy", hub: "HKG", cheap: 1.13, icao: "CPA", country: "Hong Kong",            region: "Asia",           website: "https://www.cathaypacific.com" },
  NH: { code: "NH", name: "ANA",                   alliance: "Star Alliance", carrierType: "Legacy", hub: "HND", cheap: 1.08, icao: "ANA", country: "Japan",                region: "Asia",           website: "https://www.ana.co.jp" },
  JL: { code: "JL", name: "Japan Airlines",        alliance: "Oneworld",      carrierType: "Legacy", hub: "HND", cheap: 1.07, icao: "JAL", country: "Japan",                region: "Asia",           website: "https://www.jal.com" },
  KE: { code: "KE", name: "Korean Air",            alliance: "SkyTeam",       carrierType: "Legacy", hub: "ICN", cheap: 1.05, icao: "KAL", country: "South Korea",          region: "Asia",           website: "https://www.koreanair.com" },
  OZ: { code: "OZ", name: "Asiana Airlines",       alliance: "Star Alliance", carrierType: "Legacy", hub: "ICN", cheap: 1.02, icao: "AAR", country: "South Korea",          region: "Asia",           website: "https://www.flyasiana.com" },
  BR: { code: "BR", name: "EVA Air",               alliance: "Star Alliance", carrierType: "Legacy", hub: "TPE", cheap: 1.03, icao: "EVA", country: "Taiwan",               region: "Asia",           website: "https://www.evaair.com" },
  CI: { code: "CI", name: "China Airlines",        alliance: "SkyTeam",       carrierType: "Legacy", hub: "TPE", cheap: 1.00, icao: "CAL", country: "Taiwan",               region: "Asia",           website: "https://www.china-airlines.com" },
  CA: { code: "CA", name: "Air China",             alliance: "Star Alliance", carrierType: "Legacy", hub: "PEK", cheap: 0.95, icao: "CCA", country: "China",                region: "Asia",           website: "https://www.airchina.com" },
  MU: { code: "MU", name: "China Eastern",         alliance: "SkyTeam",       carrierType: "Legacy", hub: "PVG", cheap: 0.93, icao: "CES", country: "China",                region: "Asia",           website: "https://www.ceair.com" },
  CZ: { code: "CZ", name: "China Southern",        alliance: "None",          carrierType: "Legacy", hub: "CAN", cheap: 0.92, icao: "CSN", country: "China",                region: "Asia",           website: "https://www.csair.com" },
  HU: { code: "HU", name: "Hainan Airlines",       alliance: "None",          carrierType: "Legacy", hub: "HAK", cheap: 0.90, icao: "CHH", country: "China",                region: "Asia",           website: "https://www.hainanairlines.com" },
  TG: { code: "TG", name: "Thai Airways",          alliance: "Star Alliance", carrierType: "Legacy", hub: "BKK", cheap: 0.94, icao: "THA", country: "Thailand",             region: "Asia",           website: "https://www.thaiairways.com" },
  VN: { code: "VN", name: "Vietnam Airlines",      alliance: "SkyTeam",       carrierType: "Legacy", hub: "HAN", cheap: 0.90, icao: "HVN", country: "Vietnam",              region: "Asia",           website: "https://www.vietnamairlines.com" },
  MH: { code: "MH", name: "Malaysia Airlines",     alliance: "Oneworld",      carrierType: "Legacy", hub: "KUL", cheap: 0.92, icao: "MAS", country: "Malaysia",             region: "Asia",           website: "https://www.malaysiaairlines.com" },
  GA: { code: "GA", name: "Garuda Indonesia",      alliance: "SkyTeam",       carrierType: "Legacy", hub: "CGK", cheap: 0.89, icao: "GIA", country: "Indonesia",            region: "Asia",           website: "https://www.garuda-indonesia.com" },
  PR: { code: "PR", name: "Philippine Airlines",   alliance: "Oneworld",      carrierType: "Legacy", hub: "MNL", cheap: 0.91, icao: "PAL", country: "Philippines",          region: "Asia",           website: "https://www.philippineairlines.com" },
  AI: { code: "AI", name: "Air India",             alliance: "Star Alliance", carrierType: "Legacy", hub: "DEL", cheap: 0.87, icao: "AIC", country: "India",                region: "Asia",           website: "https://www.airindia.com" },
  UL: { code: "UL", name: "SriLankan Airlines",    alliance: "Oneworld",      carrierType: "Legacy", hub: "CMB", cheap: 0.88, icao: "ALK", country: "Sri Lanka",            region: "Asia",           website: "https://www.srilankan.com" },
  "6E": { code: "6E", name: "IndiGo",              alliance: "None",          carrierType: "LCC",    hub: "DEL", cheap: 0.61, icao: "IGO", country: "India",                region: "Asia",           website: "https://www.goindigo.in" },
  HY: { code: "HY", name: "Uzbekistan Airways",    alliance: "None",          carrierType: "Legacy", hub: "TAS", cheap: 0.88, icao: "UZB", country: "Uzbekistan",           region: "Asia",           website: "https://www.uzairways.com" },
  // ── Oceania ───────────────────────────────────────────────────────────────
  QF: { code: "QF", name: "Qantas",                alliance: "Oneworld",      carrierType: "Legacy", hub: "SYD", cheap: 1.09, icao: "QFA", country: "Australia",            region: "Oceania",        website: "https://www.qantas.com" },
  NZ: { code: "NZ", name: "Air New Zealand",       alliance: "Star Alliance", carrierType: "Legacy", hub: "AKL", cheap: 1.06, icao: "ANZ", country: "New Zealand",          region: "Oceania",        website: "https://www.airnewzealand.com" },
  VA: { code: "VA", name: "Virgin Australia",      alliance: "None",          carrierType: "Legacy", hub: "MEL", cheap: 0.90, icao: "VOZ", country: "Australia",            region: "Oceania",        website: "https://www.virginaustralia.com" },
  JQ: { code: "JQ", name: "Jetstar",               alliance: "None",          carrierType: "LCC",    hub: "MEL", cheap: 0.65, icao: "JST", country: "Australia",            region: "Oceania",        website: "https://www.jetstar.com" },
  // ── Special Regional ──────────────────────────────────────────────────────
  LY: { code: "LY", name: "El Al",                 alliance: "None",          carrierType: "Legacy", hub: "TLV", cheap: 1.06, icao: "ELY", country: "Israel",               region: "Middle East",    website: "https://www.elal.com" },
  IZ: { code: "IZ", name: "Air Haifa",             alliance: "None",          carrierType: "Legacy", hub: "HFA", cheap: 0.75, icao: "AHA", country: "Israel",               region: "Middle East",    website: "https://www.airhaifa.com" },
  U8: { code: "U8", name: "TUS Airways",           alliance: "None",          carrierType: "Legacy", hub: "LCA", cheap: 0.82, icao: "TUS", country: "Cyprus",               region: "Europe",         website: "https://www.tusairways.com" },
  "5F": { code: "5F", name: "FlyOne",              alliance: "None",          carrierType: "LCC",    hub: "KIV", cheap: 0.64, icao: "FIA", country: "Moldova",              region: "Europe",         website: "https://www.flyone.eu" },
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
