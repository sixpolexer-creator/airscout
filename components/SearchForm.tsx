"use client";

import Calendar from "@/components/Calendar";
import AsyncAirportSelect from "@/components/AsyncAirportSelect";
import { useSearch, type JourneyType, type MultiLeg } from "@/components/store";
import type { CabinClass } from "@/lib/types";

const CABINS: { value: CabinClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const JOURNEYS: JourneyType[] = ["Oneway", "Roundtrip", "Multi-City"];

function fmt(date?: string): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function SearchForm() {
  const s = useSearch();
  const multiCity = s.journeyType === "Multi-City";
  const roundtrip = s.journeyType === "Roundtrip";

  return (
    <div className="rounded-2xl border border-edge bg-panel p-5 shadow-xl">
      {/* Journey type */}
      <div className="mb-4 inline-flex rounded-lg border border-edge bg-ink/50 p-0.5">
        {JOURNEYS.map((j) => (
          <button
            key={j}
            type="button"
            onClick={() => s.set({ journeyType: j, error: null })}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              s.journeyType === j ? "bg-accent text-ink" : "text-slate-300 hover:text-white"
            }`}
          >
            {j}
          </button>
        ))}
      </div>

      {multiCity ? (
        <MultiCity />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <AsyncAirportSelect label="From" value={s.origin} onChange={(code) => s.set({ origin: code })} />
              </div>
              <button
                type="button"
                onClick={() => s.swap()}
                title="Swap destinations"
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-edge text-slate-300 transition hover:bg-edge hover:text-white"
              >
                ⇄
              </button>
              <div className="flex-1">
                <AsyncAirportSelect label="To" value={s.destination} onChange={(code) => s.set({ destination: code })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Passengers">
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={s.passengers}
                  onChange={(e) => s.set({ passengers: Math.max(1, Math.min(9, Number(e.target.value) || 1)) })}
                  className="input"
                />
              </Field>
              <Field label="Cabin">
                <select
                  value={s.cabin}
                  onChange={(e) => s.set({ cabin: e.target.value as CabinClass })}
                  className="input"
                >
                  {CABINS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={`Date flexibility: ±${s.flexDays} day${s.flexDays === 1 ? "" : "s"}`}>
              <input
                type="range"
                min={0}
                max={7}
                value={s.flexDays}
                onChange={(e) => s.set({ flexDays: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </Field>

            <div className="flex items-center justify-between rounded-xl border border-edge bg-ink/40 px-4 py-3 text-sm">
              <div>
                <div className="text-slate-400 text-xs">Depart</div>
                <div className="font-semibold text-slate-100">{fmt(s.departDate)}</div>
              </div>
              <div className="text-slate-600">→</div>
              <div className="text-right">
                <div className="text-slate-400 text-xs">Return</div>
                <div className="font-semibold text-slate-100">{roundtrip ? fmt(s.returnDate) : "one way"}</div>
              </div>
            </div>

            <StopCounters />

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={s.includeNearby}
                onChange={(e) => s.set({ includeNearby: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              Also scan alternate airports near the destination
            </label>

            <button
              type="button"
              onClick={() => s.run()}
              disabled={s.searching}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-accent2 py-3 font-bold text-ink transition disabled:opacity-50 hover:brightness-110"
            >
              {s.searching ? "Scanning inventories…" : "Find the cheapest way there"}
            </button>

            {s.error && <p className="text-sm text-rose-400">{s.error}</p>}
          </div>

          <div className="rounded-xl border border-edge bg-ink/40 p-4">
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

function MultiCity() {
  const s = useSearch();

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
    <div className="space-y-4">
      <div className="space-y-3">
        {s.legs.map((leg, i) => (
          <div key={i} className="rounded-xl border border-edge bg-ink/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Leg {i + 1}</span>
              {s.legs.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeLeg(i)}
                  className="text-xs text-slate-500 hover:text-rose-400"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <AsyncAirportSelect label="From" value={leg.origin} onChange={(code) => update(i, { origin: code })} />
              <AsyncAirportSelect label="To" value={leg.destination} onChange={(code) => update(i, { destination: code })} />
              <Field label="Date">
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
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addLeg}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-edge"
        >
          + Add leg
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">Pax</span>
          <input
            type="number"
            min={1}
            max={9}
            value={s.passengers}
            onChange={(e) => s.set({ passengers: Math.max(1, Math.min(9, Number(e.target.value) || 1)) })}
            className="input w-16"
          />
          <select
            value={s.cabin}
            onChange={(e) => s.set({ cabin: e.target.value as CabinClass })}
            className="input w-32"
          >
            {CABINS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => s.run()}
        disabled={s.searching}
        className="w-full rounded-xl bg-gradient-to-r from-accent to-accent2 py-3 font-bold text-ink transition disabled:opacity-50 hover:brightness-110"
      >
        {s.searching ? "Scanning inventories…" : `Search ${s.legs.filter((l) => l.origin && l.destination && l.date).length} legs`}
      </button>

      {s.error && <p className="text-sm text-rose-400">{s.error}</p>}
    </div>
  );
}

// Per-leg max-stops selectors; shown below the date display in Oneway / Roundtrip views.
function StopCounters() {
  const { journeyType, filters, setFilter } = useSearch();
  if (journeyType === "Multi-City") return null;
  const roundtrip = journeyType === "Roundtrip";
  return (
    <div className={`grid gap-3 ${roundtrip ? "grid-cols-2" : "grid-cols-1"}`}>
      <StopPicker
        label="Max stops — outbound"
        value={filters.outboundMaxStops}
        onChange={(v) => setFilter({ outboundMaxStops: v })}
      />
      {roundtrip && (
        <StopPicker
          label="Max stops — return"
          value={filters.returnMaxStops}
          onChange={(v) => setFilter({ returnMaxStops: v })}
        />
      )}
    </div>
  );
}

const STOP_OPTS: { v: number | "any"; label: string }[] = [
  { v: "any", label: "Any" },
  { v: 0, label: "Direct" },
  { v: 1, label: "≤1" },
  { v: 2, label: "≤2" },
];

function StopPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | "any";
  onChange: (v: number | "any") => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      <div className="inline-flex w-full rounded-lg border border-edge bg-ink/50 p-0.5">
        {STOP_OPTS.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              value === o.v
                ? "bg-accent text-ink"
                : "text-slate-300 hover:text-white"
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
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}
