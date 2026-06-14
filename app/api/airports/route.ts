import type { NextRequest } from "next/server";
import { AIRPORTS, airportByCode, searchAirportOptions } from "@/lib/airports";
import type { AirportOption } from "@/lib/airport-types";

export const runtime = "nodejs";

// Before the user types, show a shortlist of the world's busiest hubs.
const POPULAR: AirportOption[] = ["TLV", "LCA", "JFK", "LHR", "CDG", "DXB", "SIN", "IST", "AMS", "LAX"]
  .map((c) => airportByCode(c))
  .filter((a): a is NonNullable<typeof a> => Boolean(a))
  .map((a) => ({ ...a, kind: "airport" as const }));

// GET /api/airports?q=par   -> async type-ahead (global, with metro groups)
// GET /api/airports?code=JFK -> resolve a single airport (for display)
export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (code) {
    const a = airportByCode(code);
    return Response.json(a ? [{ ...a, kind: "airport" }] : []);
  }
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return Response.json(POPULAR);
  return Response.json(searchAirportOptions(q, 8));
}

// Tiny health signal used by tests/diagnostics.
export function HEAD() {
  return new Response(null, { headers: { "X-Airport-Count": String(AIRPORTS.length) } });
}
