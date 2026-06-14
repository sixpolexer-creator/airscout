// Type-only module — safe to import from client components without pulling in
// the ~7,000-entry airport dataset (which must stay server-side).
export interface Airport {
  code: string;   // IATA
  city: string;
  name: string;
  country: string; // resolved country name (from ISO 3166-1 alpha-2)
  countryCode: string; // ISO 3166-1 alpha-2
  lat: number;
  lon: number;
}

// A single autocomplete result row. `kind: "city"` is a metro group that
// stands in for every airport serving a city (e.g. "Paris — All airports");
// selecting it resolves to the metro's primary hub (`code`).
export interface AirportOption extends Airport {
  kind: "airport" | "city";
  airportCount?: number; // number of airports in the metro (city rows only)
}
