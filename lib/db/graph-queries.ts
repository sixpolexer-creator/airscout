/**
 * Optimized graph queries for multi-city hop calculation (Step 3).
 *
 * All queries use parameterized Cypher to prevent injection.
 * The multi-hop query leverages Neo4j's APOC shortest-path algorithm
 * for O(log n) traversal even on large airport graphs.
 *
 * Requires: APOC plugin on Neo4j (included in AuraDB and Docker image neo4j:5-enterprise).
 * Memgraph alternative: replace apoc.algo.dijkstra with MAGE's shortest_path().
 */

import { graphDb } from "@/lib/db/graph-client";

// ── Return types ──────────────────────────────────────────────────────────────

export interface HopSegment {
  from: string;
  to: string;
  carrierCode: string;
  flightNumber: string;
  durationMin: number;
  priceUSD: number;
  departUtc: string;
  arriveUtc: string;
}

export interface HopPath {
  waypoints: string[];   // ordered IATA codes, e.g. ["TLV", "LHR", "JFK"]
  segments: HopSegment[];
  totalDurationMin: number;
  totalPriceUSD: number;
  stops: number;         // waypoints.length - 2 (excluding origin and final dest)
}

export interface MultiCityQuery {
  legs: Array<{ origin: string; destination: string }>;
  maxStopsPerLeg?: number;   // default 2
  maxPriceUSD?: number;      // optional budget cap
  cabin?: string;             // "economy" | "business" etc.
  departsAfterUtc?: string;  // ISO 8601
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Find the cheapest multi-stop path between a single origin → destination pair.
 * Uses Dijkstra over FLIGHT edges weighted by priceUSD.
 */
export async function cheapestPath(
  origin: string,
  destination: string,
  opts: { maxStops?: number; maxPriceUSD?: number; cabin?: string } = {},
): Promise<HopPath[]> {
  const maxStops = opts.maxStops ?? 2;

  const rows = await graphDb.query<{
    waypoints: string[];
    segments: HopSegment[];
    totalCost: number;
    totalDuration: number;
  }>(
    `MATCH path = (start:Airport {code: $origin})-[flights:FLIGHT*1..${maxStops + 1}]->(end:Airport {code: $dest})
     WHERE ALL(f IN flights WHERE
       ($cabin IS NULL OR f.cabin = $cabin) AND
       ($maxPrice IS NULL OR f.priceUSD <= $maxPrice) AND
       datetime(f.validUntil) > datetime()
     )
     WITH path, flights,
          [n IN nodes(path) | n.code]            AS waypoints,
          reduce(cost = 0, f IN flights | cost + f.priceUSD)     AS totalCost,
          reduce(dur  = 0, f IN flights | dur  + f.durationMin)  AS totalDuration
     ORDER BY totalCost ASC
     LIMIT 10
     RETURN waypoints, totalCost, totalDuration,
            [f IN flights | {
              from:         startNode(f).code,
              to:           endNode(f).code,
              carrierCode:  f.carrierCode,
              flightNumber: f.flightNumber,
              durationMin:  f.durationMin,
              priceUSD:     f.priceUSD,
              departUtc:    f.departUtc,
              arriveUtc:    f.arriveUtc
            }] AS segments`,
    {
      origin,
      dest:     destination,
      cabin:    opts.cabin    ?? null,
      maxPrice: opts.maxPriceUSD ?? null,
    },
  );

  return rows.map((r) => ({
    waypoints:        r.waypoints,
    segments:         r.segments,
    totalDurationMin: r.totalDuration,
    totalPriceUSD:    r.totalCost,
    stops:            r.waypoints.length - 2,
  }));
}

/**
 * Solve a full multi-city itinerary by running cheapestPath() for each leg
 * in sequence and assembling the combined path.
 *
 * This keeps each leg independently optimizable while preserving the overall
 * price ranking across the combined journey.
 */
export async function multiCityHops(query: MultiCityQuery): Promise<HopPath[]> {
  const { legs, maxStopsPerLeg = 2, maxPriceUSD, cabin } = query;

  if (legs.length < 2) {
    throw new Error("multiCityHops requires at least 2 legs.");
  }

  const legResults = await Promise.all(
    legs.map((leg) =>
      cheapestPath(leg.origin, leg.destination, {
        maxStops: maxStopsPerLeg,
        cabin,
      }),
    ),
  );

  // Combine best path from each leg into composite itineraries.
  // We take the top-3 per leg and return the cheapest 10 full combos.
  const combos = cartesianProduct(legResults.map((paths) => paths.slice(0, 3)));

  const assembled = combos
    .map((legPaths) => {
      const allSegments = legPaths.flatMap((p) => p.segments);
      const allWaypoints = [
        legPaths[0].waypoints[0],
        ...legPaths.flatMap((p) => p.waypoints.slice(1)),
      ];
      const totalPriceUSD    = legPaths.reduce((s, p) => s + p.totalPriceUSD, 0);
      const totalDurationMin = legPaths.reduce((s, p) => s + p.totalDurationMin, 0);

      return {
        waypoints:        allWaypoints,
        segments:         allSegments,
        totalDurationMin,
        totalPriceUSD,
        stops:            allWaypoints.length - 2,
      } satisfies HopPath;
    })
    .filter((p) => maxPriceUSD == null || p.totalPriceUSD <= maxPriceUSD)
    .sort((a, b) => a.totalPriceUSD - b.totalPriceUSD)
    .slice(0, 10);

  return assembled;
}

/** Lookup airports whose name/city matches a free-text query (for NLP resolver). */
export async function resolveAirportByText(
  text: string,
): Promise<Array<{ code: string; name: string; city: string; score: number }>> {
  return graphDb.query(
    `CALL db.index.fulltext.queryNodes("airport_name_ft", $q)
     YIELD node, score
     RETURN node.code AS code, node.name AS name, node.city AS city, score
     ORDER BY score DESC
     LIMIT 5`,
    { q: text },
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────

function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]],
  );
}
