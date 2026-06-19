import type { SearchQuery } from "@/lib/types";

// Expand a query by +/- flexDays into one query per candidate departure date.
// This is how the engine "catches ultra-low-cost windows" automatically.
export function expandFlexDates(query: SearchQuery): SearchQuery[] {
  // Trip-duration window mode: generate all (depart, return) pairs whose stay length
  // falls within [tripDaysMin, tripDaysMax] inside the calendar window. Capped at 30.
  if (query.tripDaysMin != null && query.returnDate) {
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

// Generate (depart, return) pairs within the calendar window where the stay length
// falls within [tripDaysMin, tripDaysMax]. Iterates departure dates from windowStart
// outward, and for each departure tries every stay length in the range. Capped at 30
// pairs so the scan stays tractable even for wide flex windows.
function expandTripDurationWindow(query: SearchQuery): SearchQuery[] {
  const stayMin = query.tripDaysMin!;
  const stayMax = query.tripDaysMax ?? stayMin;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const windowStart = new Date(`${query.departDate}T00:00:00Z`);
  const windowEnd   = new Date(`${query.returnDate}T00:00:00Z`);

  const pairs: SearchQuery[] = [];
  const cursor = new Date(Math.max(windowStart.getTime(), today.getTime()));

  while (cursor <= windowEnd && pairs.length < 30) {
    for (let stay = stayMin; stay <= stayMax && pairs.length < 30; stay++) {
      const ret = new Date(cursor);
      ret.setUTCDate(ret.getUTCDate() + stay);
      if (ret > windowEnd) continue; // this stay overshoots the window
      pairs.push({
        ...query,
        departDate: cursor.toISOString().slice(0, 10),
        returnDate: ret.toISOString().slice(0, 10),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return pairs.length > 0 ? pairs : [query];
}
