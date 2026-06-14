import rawData from "@/lib/airports.data.json";
import type { Airport, AirportOption } from "@/lib/airport-types";
import { isMajorHub, MAJOR_HUB_CODES } from "@/lib/major-hubs";

// Re-export the types so existing server-side importers keep working unchanged.
export type { Airport, AirportOption } from "@/lib/airport-types";

// Compact row format from airports.data.json:
// [iata, city, name, countryCode(ISO2), lat, lon]
type RawRow = [string, string, string, string, number, number];

// Resolve ISO 3166-1 alpha-2 codes to display names natively (covers every
// country code without a hardcoded table). Falls back to the raw code.
const REGION_NAMES =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryName(code: string): string {
  if (REGION_NAMES) {
    try {
      const n = REGION_NAMES.of(code.toUpperCase());
      if (n) return n;
    } catch {
      // invalid region code — fall through to the raw code
    }
  }
  return code;
}

// The full global airport set (~7,000 commercial airports, worldwide).
export const AIRPORTS: Airport[] = (rawData as RawRow[]).map((r) => ({
  code: r[0],
  city: r[1],
  name: r[2],
  countryCode: r[3],
  country: countryName(r[3]),
  lat: r[4],
  lon: r[5],
}));

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

// Metro index: city|countryCode -> all serving airports, primary hub first.
const CITY_INDEX = new Map<string, Airport[]>();
for (const a of AIRPORTS) {
  const key = `${a.city}|${a.countryCode}`;
  const list = CITY_INDEX.get(key);
  if (list) list.push(a);
  else CITY_INDEX.set(key, [a]);
}
for (const list of CITY_INDEX.values()) {
  list.sort((x, y) => Number(isMajorHub(y.code)) - Number(isMajorHub(x.code)) || x.code.localeCompare(y.code));
}

export function airportByCode(code: string): Airport | undefined {
  return BY_CODE.get(code.toUpperCase());
}

// The curated major-hub subset, in the order defined by MAJOR_HUB_CODES.
export const MAJOR_AIRPORTS: Airport[] = MAJOR_HUB_CODES
  .map((c) => BY_CODE.get(c))
  .filter((a): a is Airport => Boolean(a));

// Type-ahead search across code, city, name, and country. Larger cities and
// well-known hubs are nudged up so common results surface first.
// `majorOnly` restricts results to curated international hubs (dropdown use).
export function searchAirports(query: string, limit = 8, majorOnly = false): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const pool = majorOnly ? MAJOR_AIRPORTS : AIRPORTS;
  const scored: { a: Airport; score: number }[] = [];
  for (const a of pool) {
    const code = a.code.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    let score = -1;
    if (code === q) score = 100;
    else if (code.startsWith(q)) score = 90;
    else if (city === q) score = 85;
    else if (city.startsWith(q)) score = 78;
    else if (city.includes(q)) score = 58;
    else if (name.includes(q)) score = 40;
    else if (a.country.toLowerCase().includes(q)) score = 20;
    // Surface well-known international hubs above obscure same-prefix airports.
    if (score >= 0 && isMajorHub(a.code)) score += 20;
    if (score >= 0) scored.push({ a, score });
  }
  scored.sort((x, y) => y.score - x.score || x.a.city.localeCompare(y.a.city));
  return scored.slice(0, limit).map((x) => x.a);
}

// Type-ahead that mixes metro "All airports" groups with specific airports.
// Designed to back an async select querying a dataset of thousands.
export function searchAirportOptions(query: string, limit = 8): AirportOption[] {
  const matches = searchAirports(query, 25);

  const out: AirportOption[] = [];
  const expanded = new Set<string>();
  for (const a of matches) {
    if (out.length >= limit) break;
    const key = `${a.city}|${a.countryCode}`;
    if (expanded.has(key)) continue;
    // Pull the full metro roster so e.g. ORY/BVA join Paris even if they
    // didn't rank into the match pool themselves.
    const cityAirports = CITY_INDEX.get(key) ?? [a];
    if (cityAirports.length >= 2) {
      expanded.add(key);
      out.push({ ...cityAirports[0], kind: "city", name: "All airports", airportCount: cityAirports.length });
      for (const g of cityAirports) {
        if (out.length >= limit) break;
        out.push({ ...g, kind: "airport" });
      }
    } else {
      out.push({ ...a, kind: "airport" });
    }
  }
  return out.slice(0, limit);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Great-circle distance in kilometers.
export function haversineKm(a: Airport, b: Airport): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Airports within maxKm of `code` (excluding itself), nearest first.
// `majorOnly` keeps alternate-airport suggestions to curated hubs only.
export function nearbyAirports(
  code: string,
  maxKm = 130,
  majorOnly = false,
): { airport: Airport; km: number }[] {
  const origin = airportByCode(code);
  if (!origin) return [];
  const pool = majorOnly ? MAJOR_AIRPORTS : AIRPORTS;
  const out: { airport: Airport; km: number }[] = [];
  for (const a of pool) {
    if (a.code === origin.code) continue;
    const km = haversineKm(origin, a);
    if (km <= maxKm) out.push({ airport: a, km });
  }
  out.sort((x, y) => x.km - y.km);
  return out;
}
