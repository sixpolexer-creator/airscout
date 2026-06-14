import type { FlightOffer } from "@/lib/types";

// Total door-to-door travel time across both directions (round trips included).
export function totalTravelMin(offer: FlightOffer): number {
  return offer.durationMin + (offer.inbound?.durationMin ?? 0);
}

// Deduplicate offers that are effectively the same itinerary+price across
// sources, and drop anything malformed. Keeps the cheapest of any duplicate.
export function dedupeOffers(offers: FlightOffer[]): FlightOffer[] {
  const byKey = new Map<string, FlightOffer>();
  for (const o of offers) {
    if (!o.segments.length || o.priceTotal <= 0) continue;
    const legKey = (segs: FlightOffer["segments"]) =>
      segs.map((s) => `${s.flightNumber}@${s.departUtc}`).join(">");
    const key = [
      legKey(o.segments),
      o.inbound ? legKey(o.inbound.segments) : "ow",
      o.cabin,
    ].join("|");
    const existing = byKey.get(key);
    if (!existing || o.priceTotal < existing.priceTotal) {
      byKey.set(key, o);
    }
  }
  return [...byKey.values()];
}

// Median total price — used as the baseline for savings calculations.
export function medianPrice(offers: FlightOffer[]): number {
  if (offers.length === 0) return 0;
  const sorted = [...offers].map((o) => o.priceTotal).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// Core efficiency metric: cost per hour of total travel time (both directions).
// Lower is better — it rewards cheap AND fast itineraries.
export function efficiencyCoeff(offer: FlightOffer): number {
  const hours = Math.max(0.5, totalTravelMin(offer) / 60);
  return Math.round((offer.priceTotal / hours) * 100) / 100;
}
