import type { NextRequest } from "next/server";
import type { CabinClass, FeedEvent, FlightOffer, SearchQuery } from "@/lib/types";
import { activeAdapters } from "@/lib/adapters";
import { expandFlexDates } from "@/lib/flex";
import { dedupeOffers } from "@/lib/normalize";
import { reasonedRank } from "@/lib/reasoning";
import { nearbyAirports } from "@/lib/airports";

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
  if (!/^[A-Z]{3}$/.test(destination)) return { error: "destination must be a 3-letter IATA code." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departDate)) return { error: "departDate must be YYYY-MM-DD." };
  if (origin === destination) return { error: "origin and destination must differ." };

  const returnDateRaw = b.returnDate ? String(b.returnDate).trim() : undefined;
  const returnDate = returnDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(returnDateRaw) ? returnDateRaw : undefined;
  const cabin = CABINS.includes(b.cabin as CabinClass) ? (b.cabin as CabinClass) : "economy";
  const passengers = Math.min(9, Math.max(1, Math.floor(Number(b.passengers) || 1)));
  const flexDays = Math.min(7, Math.max(0, Math.floor(Number(b.flexDays) || 0)));
  const maxStops = b.maxStops != null ? Math.max(0, Math.floor(Number(b.maxStops))) : undefined;
  const includeNearby = Boolean(b.includeNearby);

  return { origin, destination, departDate, returnDate, passengers, cabin, flexDays, maxStops, includeNearby };
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

        // Destination set = requested airport + (optionally) nearby alternates.
        const destinations: { code: string; km: number }[] = [{ code: query.destination, km: 0 }];
        if (query.includeNearby) {
          for (const n of nearbyAirports(query.destination, 130, true).slice(0, 3)) {
            destinations.push({ code: n.airport.code, km: n.km });
          }
        }

        send({
          type: "status",
          phase: "init",
          detail: `Scanning ${adapters.map((a) => a.label).join(", ")} · ${dateQueries.length} date(s) × ${destinations.length} airport(s)${query.returnDate ? " · round trip" : ""}`,
          at: Date.now(),
        });

        const collected: FlightOffer[] = [];
        for (const dest of destinations) {
          for (const dq of dateQueries) {
            const scopedQuery = { ...dq, destination: dest.code };
            for (const adapter of adapters) {
              send({
                type: "status",
                phase: "fetch",
                detail: `${adapter.label}: ${scopedQuery.origin}→${dest.code}${dest.km > 0 ? ` (≈${dest.km}km from ${query.destination})` : ""} on ${dq.departDate}`,
                at: Date.now(),
              });
              try {
                const offers = await adapter.search(scopedQuery);
                for (const o of offers) o.nearbyKm = dest.km;
                collected.push(...offers);
                send({
                  type: "status",
                  phase: "fetched",
                  detail: `${adapter.label} returned ${offers.length} offers for ${dest.code} on ${dq.departDate}`,
                  at: Date.now(),
                });
              } catch (err) {
                // Automated fallback: a failing source never aborts the search.
                send({
                  type: "status",
                  phase: "fallback",
                  detail: `${adapter.label} failed (${(err as Error).message}); continuing with remaining sources`,
                  at: Date.now(),
                });
              }
            }
          }
        }

        const deduped = dedupeOffers(collected);
        send({
          type: "status",
          phase: "reason",
          detail: `Cross-comparing ${deduped.length} unique itineraries with the routing brain`,
          at: Date.now(),
        });

        const ranked = await reasonedRank(query, deduped);

        // Stream a generous slice so client-side filters (stops, alliance,
        // carrier, airline) always have a meaningful dataset to work over.
        for (const offer of ranked.slice(0, 40)) {
          send({ type: "deal", offer, at: Date.now() });
          await new Promise((r) => setTimeout(r, 30));
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
