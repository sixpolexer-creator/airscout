"use client";

import { useState } from "react";
import { useSearch, type ResultFilters } from "@/components/store";
import { useLang } from "@/components/LangProvider";
import { translations } from "@/lib/i18n";
import type { RankedOffer } from "@/lib/types";
import { airlineByCode } from "@/lib/airlines";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { bookingTarget } from "@/lib/booking";
import type { Translations } from "@/lib/i18n";

function hm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
}
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function passesFilters(o: RankedOffer, f: ResultFilters): boolean {
  if (f.stops === "direct" && o.stops !== 0) return false;
  if (f.stops === "1stop" && o.stops > 1) return false;
  if (f.outboundMaxStops !== "any" && o.stops > f.outboundMaxStops) return false;
  if (f.returnMaxStops !== "any" && o.roundTrip && o.inbound && o.inbound.stops > f.returnMaxStops) return false;
  if (f.carrierTypes.length > 0 && !f.carrierTypes.includes(o.carrierType)) return false;
  if (f.airlines.length > 0) {
    const codes = new Set([
      ...o.segments.map((s) => s.carrierCode),
      ...(o.inbound?.segments.map((s) => s.carrierCode) ?? []),
    ]);
    if (!f.airlines.some((a) => codes.has(a))) return false;
  }
  // Trip-duration filter: keep round trips whose stay length falls within [tripDaysMin, tripDaysMax].
  if (f.tripDaysMin !== null && f.tripDaysMax !== null && o.roundTrip && o.inbound) {
    const depMs = new Date(o.departDate).getTime();
    const retMs = new Date(o.inbound.departDate).getTime();
    const actualDays = Math.round((retMs - depMs) / 86400000);
    if (actualDays < f.tripDaysMin || actualDays > f.tripDaysMax) return false;
  }
  return true;
}

export default function DealFeed() {
  const { phase, statusLine, logLines, deals, best, scanned, filters, currency, journeyType } =
    useSearch();
  const { lang } = useLang();
  const t = translations[lang];
  const scanning = phase === "scanning";

  const filtered = deals.filter((o) => passesFilters(o, filters));
  const multiCity = journeyType === "Multi-City";
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
      {/* Feed header */}
      <div className="flex items-center gap-3">
        <div
          className={`h-2.5 w-2.5 rounded-full ${scanning ? "bg-good animate-pulseline" : "bg-slate-700"}`}
        />
        <h2 className="text-base font-bold text-slate-100 sm:text-lg">{t.liveAiDealFeed}</h2>
        {phase === "results" && scanned > 0 && (
          <span className="ml-auto rounded-full bg-edge/60 px-2.5 py-0.5 text-[11px] text-slate-400 sm:text-xs">
            {t.scannedShown(scanned, filtered.length)}
          </span>
        )}
      </div>

      {scanning ? (
        <ScanningState statusLine={statusLine} logLines={logLines} t={t} />
      ) : (
        <>
          {bestVisible && <BestBanner offer={bestVisible} currency={currency} t={t} />}

          {phase === "results" && filtered.length === 0 && deals.length > 0 && (
            <div className="animate-fade-up rounded-xl border border-dashed border-edge/60 px-6 py-12 text-center">
              <p className="font-medium text-slate-400">{t.noMatchingFlights}</p>
              <p className="mt-1 text-sm text-slate-600">{t.loosenFilters(deals.length)}</p>
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
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}

          {phase === "idle" && deals.length === 0 && (
            <div className="animate-fade-up rounded-xl border border-dashed border-edge/50 px-6 py-16 text-center">
              <div className="mb-4 text-5xl opacity-20" aria-hidden="true">✈</div>
              <p className="font-medium text-slate-400">{t.readyForTakeoff}</p>
              <p className="mt-1 text-sm text-slate-600">{t.runSearchPrompt}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScanningState({
  statusLine,
  logLines,
  t,
}: {
  statusLine: string;
  logLines: string[];
  t: Translations;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-edge bg-panel/70 p-6 sm:flex-row sm:p-7">
        <Radar />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-accent">{t.aiScanning}</div>
          <p className="mt-1 truncate text-xs text-slate-400">
            {statusLine || t.establishingUplink}
          </p>
          <div className="mt-3 h-32 overflow-hidden rounded-lg border border-edge bg-ink/70 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90">
            {logLines.map((line, i) => (
              <div key={i} className={i === logLines.length - 1 ? "text-emerald-200" : "opacity-60"}>
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
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.45) 40deg, transparent 80deg)",
        }}
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

function BestBanner({
  offer,
  currency,
  t,
}: {
  offer: RankedOffer;
  currency: CurrencyCode;
  t: Translations;
}) {
  return (
    <div className="animate-deal-in rounded-2xl border border-good/40 bg-good/10 p-4 sm:p-5 shadow-[0_0_28px_rgba(52,211,153,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulseline inline-block" />
            <span className="text-xs font-bold uppercase tracking-wider text-good">
              {t.bestValueFound}
            </span>
          </div>
          <div className="mt-1.5 text-sm leading-relaxed text-slate-300">
            {offer.segments[0].from} → {offer.segments[offer.segments.length - 1].to} ·{" "}
            {t.stopCount(offer.stops)} · {hm(offer.durationMin)} ·{" "}
            {formatMoney(offer.efficiencyCoeff, currency)}
            {t.perHour}
            {offer.savingsVsMedian > 0 && (
              <span className="font-medium text-good">
                {" "}· {t.savesVsMedian(formatMoney(offer.savingsVsMedian, currency))}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-black text-slate-50">
            {formatMoney(offer.priceTotal, currency)}
            {offer.source === "mock" && (
              <span className="ml-1 align-top text-[10px] font-medium text-slate-400">
                {t.estimated}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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

function DealCard({
  offer,
  highlighted,
  currency,
  t,
}: {
  offer: RankedOffer;
  highlighted: boolean;
  currency: CurrencyCode;
  t: Translations;
}) {
  return (
    <div
      className={`group animate-deal-in rounded-xl border p-4 transition-all duration-200 ${
        highlighted
          ? "border-good/50 bg-panel shadow-[0_0_20px_rgba(52,211,153,0.08)]"
          : "border-edge bg-panel hover:border-accent/30 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(56,189,248,0.06)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Badge cluster */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-edge px-1.5 py-0.5 text-[11px] font-bold text-slate-400">
              #{offer.rank}
            </span>
            <span className="truncate text-sm font-semibold text-slate-100">
              {airlineNames(offer)}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                offer.carrierType === "LCC"
                  ? "bg-orange-500/15 text-orange-400"
                  : "bg-slate-500/15 text-slate-400"
              }`}
            >
              {offer.carrierType === "LCC" ? t.lowCost : t.fullService}
            </span>
            {offer.alliance !== "None" && (
              <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                {offer.alliance}
              </span>
            )}
            {offer.baggageIncluded && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                {t.bagIncluded}
              </span>
            )}
            {offer.roundTrip && (
              <span className="rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent2">
                {t.roundTripBadge}
              </span>
            )}
            {offer.nearbyKm != null && offer.nearbyKm > 0 && (
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                {t.altAirport(offer.nearbyKm)}
              </span>
            )}
            {offer.separateTickets && (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                {t.separateTickets}
              </span>
            )}
            {offer.source !== "mock" && (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                {offer.source}
              </span>
            )}
          </div>

          {/* Dates */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
            <span>✈ {fmtDate(offer.departDate)}</span>
            {offer.roundTrip && offer.inbound && (
              <span>↩ {fmtDate(offer.inbound.departDate)}</span>
            )}
          </div>

          <LegRow label={t.out} segments={offer.segments} sep={t.routeSep} />
          {offer.roundTrip && offer.inbound && (
            <LegRow label={t.back} segments={offer.inbound.segments} sep={t.routeSep} />
          )}

          {offer.reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {offer.reasons.map((r, i) => (
                <span key={i} className="rounded-full bg-edge/70 px-2 py-0.5 text-[11px] text-slate-400">
                  {r}
                </span>
              ))}
            </div>
          )}

          {offer.risk && (
            <p className="mt-2 text-[11px] text-amber-400/90">⚠ {offer.risk}</p>
          )}
        </div>

        {/* Price column */}
        <div className="shrink-0 text-right">
          <div
            className="text-xl font-black text-slate-50"
            title={
              offer.source === "mock"
                ? "Estimated fare — confirm the live price at the booking site"
                : "Live fare from Duffel"
            }
          >
            {formatMoney(offer.priceTotal, currency)}
            {offer.source === "mock" && (
              <span className="ml-0.5 align-top text-[9px] font-medium text-slate-500">
                {t.estimated}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {offer.roundTrip ? `${t.outDuration} ` : ""}
            {hm(offer.durationMin)} · {t.stopCount(offer.stops)}
          </div>
          {offer.roundTrip && offer.inbound && (
            <div className="text-xs text-slate-500">
              {t.back} {hm(offer.inbound.durationMin)} · {t.stopCount(offer.inbound.stops)}
            </div>
          )}
          <div className="mt-0.5 text-xs text-accent">
            {formatMoney(offer.efficiencyCoeff, currency)}{t.perHour}
          </div>
        </div>
      </div>

      <BookButton offer={offer} t={t} />
    </div>
  );
}

function BookButton({ offer, t }: { offer: RankedOffer; t: Translations }) {
  const [redirecting, setRedirecting] = useState(false);
  const target = bookingTarget(offer);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
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
      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 ${
        redirecting
          ? "cursor-wait bg-edge text-slate-300"
          : "bg-accent text-ink hover:brightness-110 hover:shadow-[0_0_14px_rgba(56,189,248,0.3)] active:scale-[0.98]"
      }`}
    >
      {redirecting ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-slate-200" />
          {t.opening(target.name)}
        </>
      ) : (
        t.seeLivePrice(target.name)
      )}
    </a>
  );
}

function LegRow({
  label,
  segments,
  sep,
}: {
  label: string;
  segments: RankedOffer["segments"];
  sep: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      <span className="rounded bg-edge/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
        {label}
      </span>
      {segments.map((seg, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-slate-700">{sep}</span>}
          <span className="font-medium text-slate-300">{seg.from}</span>
          <span className="text-slate-600">{clock(seg.departUtc)}</span>
        </span>
      ))}
      <span className="text-slate-700">{sep}</span>
      <span className="font-medium text-slate-300">{segments[segments.length - 1].to}</span>
    </div>
  );
}
