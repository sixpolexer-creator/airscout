import type { SearchQuery } from "@/lib/types";

// Expand a query by +/- flexDays into one query per candidate departure date.
// This is how the engine "catches ultra-low-cost windows" automatically.
export function expandFlexDates(query: SearchQuery): SearchQuery[] {
  // Trip-duration window mode: generate all (depart, return=depart+tripDays) pairs
  // that fit inside the [departDate → returnDate] calendar window. Capped at 30
  // pairs to keep the scan tractable.
  if (query.tripDays && query.returnDate) {
    return expandTripDurationWindow(query);
  }

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

// Generate every (depart, return) pair within the window where return = depart + tripDays.
// The window is [query.departDate, query.returnDate]; pairs that start before today are skipped.
function expandTripDurationWindow(query: SearchQuery): SearchQuery[] {
  const tripDays = query.tripDays!;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const windowStart = new Date(`${query.departDate}T00:00:00Z`);
  const windowEnd   = new Date(`${query.returnDate}T00:00:00Z`);

  // If the window is too narrow for the chosen duration, fall back to a single query.
  const diffDays = Math.round((windowEnd.getTime() - windowStart.getTime()) / 86400000);
  if (diffDays < tripDays) return [query];

  const pairs: SearchQuery[] = [];
  const cursor = new Date(Math.max(windowStart.getTime(), today.getTime()));

  while (true) {
    const ret = new Date(cursor);
    ret.setUTCDate(ret.getUTCDate() + tripDays);
    if (ret > windowEnd || pairs.length >= 30) break;
    pairs.push({
      ...query,
      departDate: cursor.toISOString().slice(0, 10),
      returnDate: ret.toISOString().slice(0, 10),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return pairs.length > 0 ? pairs : [query];
}
