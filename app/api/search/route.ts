import type { NextRequest } from "next/server";
import type { CabinClass, FeedEvent, FlightOffer, SearchQuery } from "@/lib/types";
import { activeAdapters } from "@/lib/adapters";
import { fanOutSearch } from "@/lib/adapters/orchestrator";
import { withSearchCache } from "@/lib/adapters/cache-layer";
import { expandFlexDates } from "@/lib/flex";
import { dedupeOffers } from "@/lib/normalize";
import { reasonedRank } from "@/lib/reasoning";
import { nearbyAirports } from "@/lib/airports";
import { isRegionId, expandRegion, regionById, type RegionId } from "@/lib/regions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CABINS: CabinClass[] = ["economy", "premium_economy", "business", "first"];

function parseQuery(body: unknown): SearchQuery | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Body must be an object." };
  const b = body as Record<string, unknown>;
  const origin = String(b.origin ?? "").trim().toUpperCase();
  const destination = String(b.destination ?? "").trim().toUpperCase();
  const departDate = String(b.departDate ?? "").trim();

  if (!/^[A-Z]{3}$/.test(origin)) return { error: "origin must be a 3-letter IATA code." };
  if (!/^[A-Z]{3}$/.test(destination) && !isRegionId(destination))
    return { error: "destination must be a 3-letter IATA code or a region ID (e.g. REG_EUR)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departDate)) return { error: "departDate must be YYYY-MM-DD." };
  if (origin === destination) return { error: "origin and destination must differ." };

  const returnDateRaw = b.returnDate ? String(b.returnDate).trim() : undefined;
  const returnDate = returnDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(returnDateRaw) ? returnDateRaw : undefined;
  const cabin = CABINS.includes(b.cabin as CabinClass) ? (b.cabin as CabinClass) : "economy";
  const passengers = Math.min(9, Math.max(1, Math.floor(Number(b.passengers) || 1)));
  const flexDays = Math.min(7, Math.max(0, Math.floor(Number(b.flexDays) || 0)));
  const maxStops = b.maxStops != null ? Math.max(0, Math.floor(Number(b.maxStops))) : undefined;
  const includeNearby = Boolean(b.includeNearby);
  const tripDaysMin = b.tripDaysMin != null
    ? Math.max(1, Math.floor(Number(b.tripDaysMin)))
    : undefined;
  const tripDaysMax = b.tripDaysMax != null
    ? Math.min(30, Math.floor(Number(b.tripDaysMax)))
    : undefined;

  return { origin, destination, departDate, returnDate, passengers, cabin, flexDays, maxStops, includeNearby, tripDaysMin, tripDaysMax };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), { status: 400 });
  }

  const parsed = parseQuery(body);
  if ("error" in parsed) {
    return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
  }
  const query = parsed;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: FeedEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const adapters = activeAdapters();
        const dateQueries = expandFlexDates(query);

        // Destination set: expand region ID → hub array, or use single IATA code.
        const rawDest = query.destination;
        const destinations: { code: string; km: number }[] = isRegionId(rawDest)
          ? expandRegion(rawDest as RegionId).map((code) => ({ code, km: 0 }))
          : [{ code: rawDest, km: 0 }];

        // Nearby alternates only apply to single-airport destinations.
        if (query.includeNearby && !isRegionId(rawDest)) {
          for (const n of nearbyAirports(rawDest, 130, true).slice(0, 3)) {
            destinations.push({ code: n.airport.code, km: n.km });
          }
        }

        const destLabel = isRegionId(rawDest)
          ? regionById(rawDest as RegionId).label
          : rawDest;

        send({
          type: "status",
          phase: "init",
          detail: `Scanning ${adapters.map((a) => a.label).join(", ")} · ${dateQueries.length} date(s) × ${destinations.length} airport(s) → ${destLabel}${query.returnDate ? " · round trip" : ""}`,
          at: Date.now(),
        });

        const collected: FlightOffer[] = await withSearchCache(query, () =>
          fanOutSearch({ adapters, dateQueries, destinations, baseQuery: query, onEvent: send }),
        );

        const deduped = dedupeOffers(collected);
        send({
          type: "status",
          phase: "reason",
          detail: `Cross-comparing ${deduped.length} unique itineraries with the routing brain`,
          at: Date.now(),
        });

        const ranked = await reasonedRank(query, deduped);

        // Build a stop-diverse stream: reserve capacity for direct flights so
        // client-side stop filters always have data to work with, even when
        // multi-stop results dominate by efficiency ranking.
        const STREAM_CAP = 150;
        const directs = ranked.filter((o) => o.stops === 0);
        const indirects = ranked.filter((o) => o.stops > 0);
        const directQuota = Math.min(directs.length, Math.ceil(STREAM_CAP * 0.4));
        const toStream = [
          ...directs.slice(0, directQuota),
          ...indirects.slice(0, STREAM_CAP - directQuota),
        ].sort((a, b) => a.rank - b.rank);

        for (const offer of toStream) {
          send({ type: "deal", offer, at: Date.now() });
          await new Promise((r) => setTimeout(r, 20));
        }

        send({
          type: "summary",
          best: ranked[0] ?? null,
          scanned: collected.length,
          sources: adapters.map((a) => a.id),
          at: Date.now(),
        });
      } catch (err) {
        send({ type: "error", message: (err as Error).message, at: Date.now() });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
