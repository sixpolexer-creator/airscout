import type { FlightSegment } from "@/lib/types";

/** Parse ISO-8601 duration "PT7H30M" or "PT45M" → minutes. */
export function parseIsoDuration(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!m) return 0;
  return (parseInt(m[1] ?? "0", 10) * 60) + parseInt(m[2] ?? "0", 10);
}

/** Parse Ryanair "0002:30" (zero-padded HHHH:MM) → minutes. */
export function parseHHMM(hhmm: string): number {
  const [h = "0", min = "0"] = hhmm.split(":");
  return parseInt(h, 10) * 60 + parseInt(min, 10);
}

/** Elapsed wall-clock minutes between two ISO-8601 UTC strings. Clamped to ≥ 0. */
export function elapsedMinutes(departUtc: string, arriveUtc: string): number {
  return Math.max(
    0,
    Math.round(
      (new Date(arriveUtc).getTime() - new Date(departUtc).getTime()) / 60_000,
    ),
  );
}

/** Total pure air-time minutes (sum of segment durations, no layovers). */
export function totalAirMinutes(
  segments: ReadonlyArray<Pick<FlightSegment, "durationMin">>,
): number {
  return segments.reduce((acc, s) => acc + s.durationMin, 0);
}

/**
 * Layover minutes = total elapsed door-to-door minus pure air time.
 * Clamped to 0 for direct (non-stop) flights.
 */
export function layoverMinutes(
  segments: ReadonlyArray<Pick<FlightSegment, "durationMin">>,
  totalElapsedMin: number,
): number {
  return Math.max(0, totalElapsedMin - totalAirMinutes(segments));
}

/**
 * Anti-bot headers mimicking a real browser session on the carrier's own site.
 * Pass the carrier's HTTPS origin (e.g. "https://www.ryanair.com").
 */
export function browserHeaders(siteOrigin: string): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": `${siteOrigin}/`,
    "Origin": siteOrigin,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };
}
