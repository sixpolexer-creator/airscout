import Anthropic from "@anthropic-ai/sdk";
import type { FlightOffer, RankedOffer, SearchQuery } from "@/lib/types";
import { efficiencyCoeff, medianPrice } from "@/lib/normalize";

const MODEL = "claude-opus-4-8";

// Deterministic baseline ranking. Always runs; also the fallback if the LLM
// is unavailable or returns something unparseable. Ranks strictly on the
// price-to-duration efficiency coefficient (lower coeff = better).
export function heuristicRank(query: SearchQuery, offers: FlightOffer[]): RankedOffer[] {
  const median = medianPrice(offers);
  const ranked = offers
    .map((o) => {
      const coeff = efficiencyCoeff(o);
      const reasons: string[] = [];
      if (o.priceTotal <= median) reasons.push(`$${median - o.priceTotal} under median price`);
      if (o.roundTrip) reasons.push(`Round trip · returns ${o.inbound?.departDate ?? ""}`.trim());
      if (o.stops === 0) reasons.push("Non-stop");
      else reasons.push(`${o.stops} stop${o.stops > 1 ? "s" : ""}, ${Math.round(o.layoverMin / 60 * 10) / 10}h connecting`);
      if (o.nearbyKm && o.nearbyKm > 0 && o.destination !== query.destination) {
        reasons.push(`Alternate airport ${o.destination} (${o.nearbyKm}km from ${query.destination})`);
      }
      if (o.baggageIncluded) reasons.push("Checked bag included");
      let risk: string | undefined;
      if (o.separateTickets) {
        risk = "Self-transfer on separate tickets — a missed connection is not protected.";
        reasons.push("Hidden-city style separate-ticket saving");
      }
      const shortConn = o.segments.length > 1 && o.layoverMin > 0 && o.layoverMin < 60;
      if (shortConn) risk = (risk ? risk + " " : "") + "Tight connection (<60 min).";
      return {
        ...o,
        rank: 0,
        efficiencyCoeff: coeff,
        savingsVsMedian: Math.max(0, median - o.priceTotal),
        reasons,
        risk,
      } satisfies RankedOffer;
    })
    .sort((a, b) => a.efficiencyCoeff - b.efficiencyCoeff)
    .map((o, i) => ({ ...o, rank: i + 1 }));
  return ranked;
}

// LLM reasoning layer. Asks Claude to re-rank the heuristic shortlist,
// reasoning about separate-ticket risk, alternate-airport value, and
// flex-date windows. Returns a re-ordered list with enriched reasons.
export async function reasonedRank(
  query: SearchQuery,
  offers: FlightOffer[],
): Promise<RankedOffer[]> {
  const baseline = heuristicRank(query, offers);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || baseline.length === 0) return baseline;

  // Only send the top slice to the model to keep it fast and cheap.
  const shortlist = baseline.slice(0, 12);
  const client = new Anthropic({ apiKey });

  const compact = shortlist.map((o) => ({
    id: o.id,
    price: o.priceTotal,
    currency: o.priceCurrency,
    durationMin: o.durationMin,
    stops: o.stops,
    layoverMin: o.layoverMin,
    separateTickets: o.separateTickets,
    baggageIncluded: o.baggageIncluded,
    roundTrip: o.roundTrip,
    arrivesAt: o.destination,
    altAirportKm: o.nearbyKm && o.destination !== query.destination ? o.nearbyKm : 0,
    coeff: o.efficiencyCoeff,
    route: o.segments.map((s) => `${s.from}-${s.to} ${s.carrierCode}`).join(" / "),
  }));

  const prompt = `You are the routing brain of a flight deal engine. The traveller wants the cheapest sensible way from ${query.origin} to ${query.destination} on/around ${query.departDate} in ${query.cabin}, ${query.passengers} passenger(s).

Rank these candidate offers from best to worst overall value. Reward low price-per-hour (coeff) but penalise unrealistic risk: separate tickets with short layovers, connections under 60 minutes, or absurd routings. Prefer offers that materially undercut the field.

Offers (JSON):
${JSON.stringify(compact)}

Respond with ONLY a JSON array, no prose. Each element:
{"id": string, "reasons": string[] (1-3 short notes), "risk": string | null}
Order the array best-first.`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = JSON.parse(extractJsonArray(text)) as {
      id: string;
      reasons?: string[];
      risk?: string | null;
    }[];

    const byId = new Map(shortlist.map((o) => [o.id, o]));
    const ordered: RankedOffer[] = [];
    parsed.forEach((p, i) => {
      const offer = byId.get(p.id);
      if (!offer) return;
      byId.delete(p.id);
      ordered.push({
        ...offer,
        rank: i + 1,
        reasons: p.reasons && p.reasons.length ? p.reasons : offer.reasons,
        risk: p.risk ?? offer.risk,
      });
    });
    // Append anything the model omitted, preserving baseline order.
    for (const leftover of byId.values()) {
      ordered.push({ ...leftover, rank: ordered.length + 1 });
    }
    // Merge LLM-reordered top slice with heuristic-ranked tail so the full
    // offer pool reaches the route handler for client-side filtering.
    const combined = [...ordered, ...baseline.slice(shortlist.length)].map((o, i) => ({
      ...o,
      rank: i + 1,
    }));
    return combined.length > 0 ? combined : baseline;
  } catch {
    // Any LLM/parse failure degrades gracefully to the deterministic ranking.
    return baseline;
  }
}

function extractJsonArray(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return "[]";
  return text.slice(start, end + 1);
}
