"use client";

import Calendar from "@/components/Calendar";
import AsyncAirportSelect from "@/components/AsyncAirportSelect";
import { useLang } from "@/components/LangProvider";
import { translations, resolveError } from "@/lib/i18n";
import { useSearch, type JourneyType, type MultiLeg } from "@/components/store";
import type { CabinClass } from "@/lib/types";

function fmt(date?: string, lang?: string): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(
    lang === "he" ? "he-IL" : "en-US",
    { month: "short", day: "numeric", timeZone: "UTC" },
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function SearchForm() {
  const s = useSearch();
  const { lang } = useLang();
  const t = translations[lang];

  const cabinOptions = [
    { value: "economy" as CabinClass, label: t.economy },
    { value: "premium_economy" as CabinClass, label: t.premium },
    { value: "business" as CabinClass, label: t.business },
    { value: "first" as CabinClass, label: t.first },
  ];

  const journeys: { value: JourneyType; label: string }[] = [
    { value: "Oneway", label: t.oneway },
    { value: "Roundtrip", label: t.roundtrip },
    { value: "Multi-City", label: t.multiCity },
  ];

  const multiCity = s.journeyType === "Multi-City";
  const roundtrip = s.journeyType === "Roundtrip";

  return (
    <div className="rounded-2xl border border-edge bg-panel p-4 shadow-xl">
      {/* Journey type tabs */}
      <div className="mb-4 inline-flex rounded-lg border border-edge bg-ink/50 p-0.5">
        {journeys.map((j) => (
          <button
            key={j.value}
            type="button"
            onClick={() => s.set({ journeyType: j.value, error: null })}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              s.journeyType === j.value
                ? "bg-accent text-ink shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {j.label}
          </button>
        ))}
      </div>

      {multiCity ? (
        <MultiCity cabinOptions={cabinOptions} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {/* Origin / Destination */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <AsyncAirportSelect
                  label={t.from}
                  value={s.origin}
                  onChange={(code) => s.set({ origin: code })}
                />
              </div>
              <button
                type="button"
                onClick={() => s.swap()}
                title={t.swapTitle}
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-edge bg-ink/40 text-slate-400 transition-all duration-200 hover:border-accent/50 hover:bg-edge hover:text-accent hover:rotate-180 active:scale-90"
              >
                ⇄
              </button>
              <div className="flex-1">
                <AsyncAirportSelect
                  label={t.to}
                  value={s.destination}
                  onChange={(code) => s.set({ destination: code })}
                />
              </div>
            </div>

            {/* Passengers + Cabin */}
            <div className="grid grid-cols-2 gap-2">
              <Field label={t.passengers}>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={s.passengers}
                  onChange={(e) =>
                    s.set({ passengers: Math.max(1, Math.min(9, Number(e.target.value) || 1)) })
                  }
                  className="input"
                />
              </Field>
              <Field label={t.cabin}>
                <select
                  value={s.cabin}
                  onChange={(e) => s.set({ cabin: e.target.value as CabinClass })}
                  className="input"
                >
                  {cabinOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Flex days */}
            <Field label={t.flexLabel(s.flexDays)}>
              <input
                type="range"
                min={0}
                max={7}
                value={s.flexDays}
                onChange={(e) => s.set({ flexDays: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </Field>

            {/* Date summary */}
            <div className="flex items-center justify-between rounded-xl border border-edge bg-ink/40 px-3 py-2.5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t.depart}</div>
                <div className="mt-0.5 font-semibold text-slate-100">{fmt(s.departDate, lang)}</div>
              </div>
              <span className="text-base text-slate-700" aria-hidden="true">✈</span>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t.returnLabel}</div>
                <div className="mt-0.5 font-semibold text-slate-100">
                  {roundtrip ? fmt(s.returnDate, lang) : t.oneWay}
                </div>
              </div>
            </div>

            <StopCounters />

            {/* Nearby airports */}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300 transition-colors hover:text-white">
              <input
                type="checkbox"
                checked={s.includeNearby}
                onChange={(e) => s.set({ includeNearby: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              {t.nearbyAirports}
            </label>

            {/* Search CTA */}
            <button
              type="button"
              onClick={() => s.run()}
              disabled={s.searching}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-accent2 py-2.5 font-bold text-ink transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110 hover:shadow-[0_0_22px_rgba(56,189,248,0.28)] active:scale-[0.98]"
            >
              {s.searching ? t.scanning : t.searchCta}
            </button>

            {s.error && (
              <p className="text-sm text-rose-400">{resolveError(s.error, t)}</p>
            )}
          </div>

          {/* Calendar */}
          <div className="rounded-xl border border-edge bg-ink/40 p-3">
            <Calendar
              depart={s.departDate || undefined}
              ret={roundtrip ? s.returnDate : undefined}
              onChange={(depart, ret) =>
                roundtrip
                  ? s.set({ departDate: depart ?? "", returnDate: ret })
                  : s.set({ departDate: ret ?? depart ?? "", returnDate: undefined })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MultiCity({ cabinOptions }: { cabinOptions: { value: CabinClass; label: string }[] }) {
  const s = useSearch();
  const { lang } = useLang();
  const t = translations[lang];

  const update = (i: number, patch: Partial<MultiLeg>) => {
    const legs = s.legs.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    s.set({ legs });
  };
  const addLeg = () => {
    const last = s.legs[s.legs.length - 1];
    s.set({ legs: [...s.legs, { origin: last?.destination ?? "", destination: "", date: "" }] });
  };
  const removeLeg = (i: number) => {
    if (s.legs.length <= 2) return;
    s.set({ legs: s.legs.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-3">
      {s.legs.map((leg, i) => (
        <div key={i} className="rounded-xl border border-edge bg-ink/40 p-3 transition-colors hover:border-edge/80">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t.legLabel} {i + 1}</span>
            {s.legs.length > 2 && (
              <button
                type="button"
                onClick={() => removeLeg(i)}
                className="text-xs text-slate-500 transition hover:text-rose-400"
              >
                {t.remove}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <AsyncAirportSelect label={t.from} value={leg.origin} onChange={(code) => update(i, { origin: code })} />
            <AsyncAirportSelect label={t.to} value={leg.destination} onChange={(code) => update(i, { destination: code })} />
            <Field label={t.date}>
              <input
                type="date"
                min={todayIso()}
                value={leg.date}
                onChange={(e) => update(i, { date: e.target.value })}
                className="input"
              />
            </Field>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addLeg}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-accent/40 hover:bg-edge hover:text-white"
        >
          {t.addLeg}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">{t.pax}</span>
          <input
            type="number"
            min={1}
            max={9}
            value={s.passengers}
            onChange={(e) =>
              s.set({ passengers: Math.max(1, Math.min(9, Number(e.target.value) || 1)) })
            }
            className="input w-14"
          />
          <select
            value={s.cabin}
            onChange={(e) => s.set({ cabin: e.target.value as CabinClass })}
            className="input w-28"
          >
            {cabinOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => s.run()}
        disabled={s.searching}
        className="w-full rounded-xl bg-gradient-to-r from-accent to-accent2 py-2.5 font-bold text-ink transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110 hover:shadow-[0_0_22px_rgba(56,189,248,0.28)] active:scale-[0.98]"
      >
        {s.searching
          ? t.scanning
          : t.searchLegs(s.legs.filter((l) => l.origin && l.destination && l.date).length)}
      </button>

      {s.error && <p className="text-sm text-rose-400">{resolveError(s.error, t)}</p>}
    </div>
  );
}

function StopCounters() {
  const { journeyType, filters, setFilter } = useSearch();
  const { lang } = useLang();
  const t = translations[lang];

  if (journeyType === "Multi-City") return null;
  const roundtrip = journeyType === "Roundtrip";

  const STOP_OPTS = [
    { v: "any" as const, label: t.any },
    { v: 0, label: t.direct },
    { v: 1, label: "≤1" },
    { v: 2, label: "≤2" },
  ];

  return (
    <div className={`grid gap-2 ${roundtrip ? "grid-cols-2" : "grid-cols-1"}`}>
      <StopPicker
        label={t.maxStopsOutbound}
        value={filters.outboundMaxStops}
        opts={STOP_OPTS}
        onChange={(v) => setFilter({ outboundMaxStops: v })}
      />
      {roundtrip && (
        <StopPicker
          label={t.maxStopsReturn}
          value={filters.returnMaxStops}
          opts={STOP_OPTS}
          onChange={(v) => setFilter({ returnMaxStops: v })}
        />
      )}
    </div>
  );
}

function StopPicker({
  label,
  value,
  opts,
  onChange,
}: {
  label: string;
  value: number | "any";
  opts: { v: number | "any"; label: string }[];
  onChange: (v: number | "any") => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-medium text-slate-500">{label}</span>
      <div className="inline-flex w-full rounded-lg border border-edge bg-ink/50 p-0.5">
        {opts.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition-all duration-150 ${
              value === o.v ? "bg-accent text-ink shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
