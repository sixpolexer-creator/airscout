/**
 * Graph schema — airport nodes and flight edges (Step 3).
 *
 * Run initSchema() once on startup (or in a migration script) to create
 * constraints and indexes.  Idempotent — safe to call multiple times.
 *
 * Node labels:   Airport
 * Relationship:  (:Airport)-[:FLIGHT]->(:Airport)
 */

import { graphDb } from "@/lib/db/graph-client";

// ── TypeScript types (mirror the Cypher property maps) ───────────────────────

export interface AirportNode {
  code: string;         // IATA, e.g. "TLV"
  name: string;         // "Ben Gurion International Airport"
  city: string;         // "Tel Aviv"
  country: string;      // "Israel"
  countryCode: string;  // ISO-3166-1 alpha-2, e.g. "IL"
  lat: number;
  lon: number;
  isMajorHub: boolean;  // true for the 35 curated hubs
  timezone: string;     // IANA tz, e.g. "Asia/Jerusalem"
}

export interface FlightEdge {
  carrierCode: string;    // IATA airline, e.g. "LY"
  flightNumber: string;   // e.g. "LY315"
  durationMin: number;
  stops: number;          // 0 = direct; 1+ = number of connections
  priceUSD: number;       // spot price at time of last cache refresh
  departUtc: string;      // ISO 8601 with offset
  arriveUtc: string;
  cabin: "economy" | "premium_economy" | "business" | "first";
  baggageIncluded: boolean;
  validUntil: string;     // ISO 8601 — price TTL (matches Redis TTL)
}

// ── Cypher DDL ────────────────────────────────────────────────────────────────

const SCHEMA_STATEMENTS = [
  // Unique constraint doubles as an index on :Airport(code).
  `CREATE CONSTRAINT airport_code_unique IF NOT EXISTS
   FOR (a:Airport) REQUIRE a.code IS UNIQUE`,

  // Composite index for fast edge lookups by carrier + departure time.
  `CREATE INDEX flight_carrier_depart IF NOT EXISTS
   FOR ()-[f:FLIGHT]-()
   ON (f.carrierCode, f.departUtc)`,

  // Full-text index on airport names for the NLP resolver.
  `CREATE FULLTEXT INDEX airport_name_ft IF NOT EXISTS
   FOR (a:Airport) ON EACH [a.name, a.city]`,
];

export async function initSchema(): Promise<void> {
  for (const stmt of SCHEMA_STATEMENTS) {
    await graphDb.write(stmt);
  }
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

/** Upsert a single Airport node. */
export async function upsertAirport(node: AirportNode): Promise<void> {
  await graphDb.write(
    `MERGE (a:Airport {code: $code})
     SET a += $props`,
    { code: node.code, props: node },
  );
}

/** Upsert a FLIGHT relationship between two airports. */
export async function upsertFlight(
  originCode: string,
  destinationCode: string,
  edge: FlightEdge,
): Promise<void> {
  await graphDb.write(
    `MATCH (origin:Airport {code: $from}), (dest:Airport {code: $to})
     MERGE (origin)-[f:FLIGHT {
       carrierCode:  $carrierCode,
       flightNumber: $flightNumber,
       departUtc:    $departUtc
     }]->(dest)
     SET f += $props`,
    {
      from: originCode,
      to:   destinationCode,
      carrierCode:  edge.carrierCode,
      flightNumber: edge.flightNumber,
      departUtc:    edge.departUtc,
      props:        edge,
    },
  );
}
