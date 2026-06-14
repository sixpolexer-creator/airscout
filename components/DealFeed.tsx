"use client";

import { useState } from "react";
import { useSearch, type ResultFilters } from "@/components/store";
import type { RankedOffer } from "@/lib/types";
import { airlineByCode } from "@/lib/airlines";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { bookingTarget } from "@/lib/booking";

function hm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

// Instant client-side filtering over the revealed deals.
function passesFilters(o: RankedOffer, f: ResultFilters): boolean {
  if (f.stops === "direct" && o.stops !== 0) return false;
  if (f.stops === "1stop" && o.stops > 1) return false;
  if (f.outboundMaxStops !== "any" && o.stops > f.outboundMaxStops) return false;
  if (f.returnMaxStops !== "any" && o.roundTrip && o.inbound && o.inbound.stops > f.returnMaxStops) return false;
  if (f.alliances.length > 0 && !f.alliances.includes(o.alliance)) return false;
  if (f.carrierTypes.length > 0 && !f.carrierTypes.includes(o.carrierType)) return false;
  if (f.airlines.length > 0) {
    const codes = new Set([
      ...o.segments.map((s) => s.carrierCode),
      ...(o.inbound?.segments.map((s) => s.carrierCode) ?? []),
    ]);
    if (!f.airlines.some((a) => codes.has(a))) return false;
  }
  return true;
}

export default function DealFeed() {
  const { phase, statusLine, logLines, deals, best, scanned, filters, currency, journeyType } = useSearch();
  const scanning = phase === "scanning";

  const filtered = deals.filter((o) => passesFilters(o, filters));
  const multiCity = journeyType === "Multi-City";
  // Group by route for multi-city so each leg has its own section.
  const groups = multiCity
    ? Object.entries(
        filtered.reduce<Record<string, RankedOffer[]>>((acc, o) => {
          const key = `${o.origin} → ${o.destination}`;
          (acc[key] ||= []).push(o);
          return acc;
        }, {}),
      )
    : [["", filtered] as [string, RankedOffer[]]];
  const bestVisible = best && passesFilters(best, filters) && !multiCity ? best : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`h-2.5 w-2.5 rounded-full ${scanning ? "bg-good animate-pulseline" : "bg-slate-600"}`} />
        <h2 className="text-base font-bold text-slate-100 sm:text-lg">Live AI Deal Feed</h2>
        {phase === "results" && scanned > 0 && (
          <span className="ml-auto text-[11px] text-slate-500 sm:text-xs">
            {scanned} scanned · {filtered.length} shown
          </span>
        )}
      </div>

      {scanning ? (
        <ScanningState statusLine={statusLine} logLines={logLines} />
      ) : (
        <>
          {bestVisible && <BestBanner offer={bestVisible} currency={currency} />}

          {phase === "results" && filtered.length === 0 && deals.length > 0 && (
            <div className="rounded-xl border border-dashed border-edge px-6 py-10 text-center text-slate-500">
              No flights match the current filters. Loosen them to see {deals.length} results.
            </div>
          )}

          {groups.map(([route, offers]) => (
            <div key={route || "all"} className="space-y-3">
              {multiCity && offers.length > 0 && (
                <h3 className="text-sm font-bold text-accent2">{route}</h3>
              )}
              <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                {offers.map((offer) => (
                  <DealCard
                    key={offer.id}
                    offer={offer}
                    currency={currency}
                    highlighted={bestVisible?.id === offer.id}
                  />
                ))}
              </div>
            </div>
          ))}

          {phase === "idle" && deals.length === 0 && (
            <div className="rounded-xl border border-dashed border-edge px-6 py-12 text-center text-slate-500">
              Run a search to watch the agents find, inspect, and verify live prices here.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Cinematic "AI scanning" state: radar sweep, live terminal log, shimmer cards.
function ScanningState({ statusLine, logLines }: { statusLine: string; logLines: string[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-edge bg-panel/70 p-6 sm:flex-row sm:p-7">
        <Radar />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-accent">AI scanning global inventory…</div>
          <p className="mt-1 truncate text-xs text-slate-400">{statusLine || "Establishing inventory uplink…"}</p>
          <div className="mt-3 h-32 overflow-hidden rounded-lg border border-edge bg-ink/70 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90">
            {logLines.map((line, i) => (
              <div key={i} className={i === logLines.length - 1 ? "text-emerald-200" : "opacity-70"}>
                {line}
              </div>
            ))}
            <div className="inline-block h-3 w-2 animate-pulseline bg-emerald-300 align-middle" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerCard key={i} />
        ))}
      </div>
    </div>
  );
}

function Radar() {
  return (
    <div className="relative h-24 w-24 shrink-0">
      <div className="absolute inset-0 rounded-full border border-accent/30" />
      <div className="absolute inset-3 rounded-full border border-accent/20" />
      <div className="absolute inset-6 rounded-full border border-accent/20" />
      <div className="absolute inset-0 animate-ping2 rounded-full border border-accent/40" />
      <div
        className="absolute inset-0 animate-radar rounded-full"
        style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.45) 40deg, transparent 80deg)" }}
      />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(56,189,248,0.7)]" />
    </div>
  );
}

function ShimmerCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-edge bg-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2.5">
          <div className="h-3.5 w-24 rounded bg-edge" />
          <div className="h-3 w-40 rounded bg-edge/70" />
          <div className="flex gap-1.5">
            <div className="h-4 w-16 rounded-full bg-edge/60" />
            <div className="h-4 w-20 rounded-full bg-edge/60" />
          </div>
        </div>
        <div className="space-y-2 text-right">
          <div className="ml-auto h-5 w-14 rounded bg-edge" />
          <div className="ml-auto h-3 w-16 rounded bg-edge/60" />
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

function BestBanner({ offer, currency }: { offer: RankedOffer; currency: CurrencyCode }) {
  return (
    <div className="rounded-2xl border border-good/40 bg-good/10 p-4 animate-deal-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-good">Best value found</span>
        <span className="text-2xl font-black text-slate-50">
          {formatMoney(offer.priceTotal, currency)}
          {offer.source === "mock" && (
            <span className="ml-1 align-top text-[10px] font-medium text-slate-400">est.</span>
          )}
        </span>
      </div>
      <div className="mt-1 text-sm text-slate-300">
        {offer.segments[0].from} → {offer.segments[offer.segments.length - 1].to} ·{" "}
        {offer.stops === 0 ? "Non-stop" : `${offer.stops} stop`} · {hm(offer.durationMin)} ·{" "}
        {formatMoney(offer.efficiencyCoeff, currency)}/hr
        {offer.savingsVsMedian > 0 && (
          <span className="text-good"> · saves {formatMoney(offer.savingsVsMedian, currency)} vs median</span>
        )}
      </div>
    </div>
  );
}

// Distinct operating airlines on the itinerary, as full names.
function airlineNames(offer: RankedOffer): string {
  const codes = [
    ...offer.segments.map((s) => s.carrierCode),
    ...(offer.inbound?.segments.map((s) => s.carrierCode) ?? []),
  ];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const c of codes) {
    if (seen.has(c)) continue;
    seen.add(c);
    names.push(airlineByCode(c)?.name ?? c);
  }
  return names.join(" + ");
}

function DealCard({ offer, highlighted, currency }: { offer: RankedOffer; highlighted: boolean; currency: CurrencyCode }) {
  return (
    <div
      className={`rounded-xl border p-4 animate-deal-in transition ${
        highlighted ? "border-good/50 bg-panel" : "border-edge bg-panel hover:border-accent/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-edge px-1.5 py-0.5 text-[11px] font-bold text-slate-300">#{offer.rank}</span>
            <span className="truncate text-sm font-semibold text-slate-100">{airlineNames(offer)}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              offer.carrierType === "LCC" ? "bg-orange-500/15 text-orange-400" : "bg-slate-500/15 text-slate-300"
            }`}>
              {offer.carrierType === "LCC" ? "Low-cost" : "Full-service"}
            </span>
            {offer.alliance !== "None" && (
              <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                {offer.alliance}
              </span>
            )}
            {offer.baggageIncluded && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                bag incl.
              </span>
            )}
            {offer.roundTrip && (
              <span className="rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent2">
                round trip
              </span>
            )}
            {offer.nearbyKm != null && offer.nearbyKm > 0 && (
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                alt airport · {offer.nearbyKm}km
              </span>
            )}
            {offer.separateTickets && (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                separate tickets
              </span>
            )}
            {offer.source !== "mock" && (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                {offer.source}
              </span>
            )}
          </div>

          <LegRow label="Out" segments={offer.segments} />
          {offer.roundTrip && offer.inbound && (
            <LegRow label="Back" segments={offer.inbound.segments} />
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {offer.reasons.map((r, i) => (
              <span key={i} className="rounded-full bg-edge/70 px-2 py-0.5 text-[11px] text-slate-300">
                {r}
              </span>
            ))}
          </div>

          {offer.risk && (
            <p className="mt-2 text-[11px] text-amber-400/90">⚠ {offer.risk}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xl font-black text-slate-50" title={offer.source === "mock" ? "Estimated fare — confirm the live price at the booking site" : "Live fare from Duffel"}>
            {formatMoney(offer.priceTotal, currency)}
            {offer.source === "mock" && (
              <span className="ml-0.5 align-top text-[9px] font-medium text-slate-500">est.</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            {offer.roundTrip ? "out " : ""}{hm(offer.durationMin)} · {offer.stops === 0 ? "direct" : `${offer.stops} stop`}
          </div>
          {offer.roundTrip && offer.inbound && (
            <div className="text-[11px] text-slate-500">
              back {hm(offer.inbound.durationMin)} · {offer.inbound.stops === 0 ? "direct" : `${offer.inbound.stops} stop`}
            </div>
          )}
          <div className="text-[11px] text-accent">{formatMoney(offer.efficiencyCoeff, currency)}/hr</div>
        </div>
      </div>

      <BookButton offer={offer} />
    </div>
  );
}

// Deep-link CTA. Renders a real <a> (right-clickable / SEO-friendly) but on
// left-click runs an 800ms "Redirecting…" handoff before opening the airline
// booking page in a new tab.
function BookButton({ offer }: { offer: RankedOffer }) {
  const [redirecting, setRedirecting] = useState(false);
  const target = bookingTarget(offer);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow modifier/middle clicks to behave like a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (redirecting) return;
    setRedirecting(true);
    setTimeout(() => {
      window.open(target.url, "_blank", "noopener,noreferrer");
      setRedirecting(false);
    }, 800);
  };

  return (
    <a
      href={target.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-busy={redirecting}
      title={`Opens ${target.name} to confirm the live price for this route`}
      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
        redirecting
          ? "cursor-wait bg-edge text-slate-300"
          : "bg-accent text-ink hover:brightness-110"
      }`}
    >
      {redirecting ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-slate-200" />
          Opening {target.name}…
        </>
      ) : (
        <>See live price on {target.name} →</>
      )}
    </a>
  );
}

function LegRow({ label, segments }: { label: string; segments: RankedOffer["segments"] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
      <span className="rounded bg-edge/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">{label}</span>
      {segments.map((seg, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-slate-600">→</span>}
          <span className="text-slate-300">{seg.from}</span>
          <span className="text-slate-600">{clock(seg.departUtc)}</span>
        </span>
      ))}
      <span className="text-slate-600">→</span>
      <span className="text-slate-300">{segments[segments.length - 1].to}</span>
    </div>
  );
}
