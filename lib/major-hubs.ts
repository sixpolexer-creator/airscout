// Curated set of the world's busiest international hubs used to populate the
// search dropdowns. Small regional / domestic-only airstrips are intentionally
// excluded. Coordinates and country names are pulled from the full dataset by
// code, so this stays a lightweight code list with no duplicated data.
export const MAJOR_HUB_CODES: string[] = [
  // Middle East / East Med (required hubs first)
  "TLV", // Tel Aviv — Ben Gurion
  "LCA", // Larnaca International
  "DXB", // Dubai
  "DOH", // Doha — Hamad
  "IST", // Istanbul
  // North America
  "JFK", // New York — Kennedy
  "EWR", // New York — Newark
  "LAX", // Los Angeles
  "SFO", // San Francisco
  "ORD", // Chicago — O'Hare
  "MIA", // Miami
  "YYZ", // Toronto — Pearson
  "GRU", // Sao Paulo — Guarulhos
  // United Kingdom / Ireland
  "LHR", // London — Heathrow
  "LGW", // London — Gatwick
  "DUB", // Dublin
  // Western / Central Europe
  "CDG", // Paris — Charles de Gaulle
  "AMS", // Amsterdam — Schiphol
  "FRA", // Frankfurt
  "MUC", // Munich
  "ZRH", // Zurich
  "VIE", // Vienna
  "CPH", // Copenhagen
  // Southern Europe
  "MAD", // Madrid
  "BCN", // Barcelona
  "FCO", // Rome — Fiumicino
  "LIS", // Lisbon
  "ATH", // Athens
  // Asia / Pacific
  "SIN", // Singapore — Changi
  "HKG", // Hong Kong
  "NRT", // Tokyo — Narita
  "HND", // Tokyo — Haneda
  "ICN", // Seoul — Incheon
  "BKK", // Bangkok — Suvarnabhumi
  "SYD", // Sydney
];

const MAJOR_SET = new Set(MAJOR_HUB_CODES);

export function isMajorHub(code: string): boolean {
  return MAJOR_SET.has(code.toUpperCase());
}
