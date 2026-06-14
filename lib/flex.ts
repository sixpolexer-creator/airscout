import type { SearchQuery } from "@/lib/types";

// Expand a query by +/- flexDays into one query per candidate departure date.
// This is how the engine "catches ultra-low-cost windows" automatically.
export function expandFlexDates(query: SearchQuery): SearchQuery[] {
  const flex = Math.max(0, Math.min(7, Math.floor(query.flexDays)));
  if (flex === 0) return [query];

  const out: SearchQuery[] = [];
  const base = new Date(`${query.departDate}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let delta = -flex; delta <= flex; delta++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + delta);
    if (d < today) continue; // never search dates in the past
    const departDate = d.toISOString().slice(0, 10);

    let returnDate = query.returnDate;
    if (returnDate) {
      // keep the trip length constant when shifting the outbound date
      const ret = new Date(`${query.returnDate}T00:00:00Z`);
      ret.setUTCDate(ret.getUTCDate() + delta);
      returnDate = ret.toISOString().slice(0, 10);
    }

    out.push({ ...query, departDate, returnDate });
  }
  return out.length > 0 ? out : [query];
}
