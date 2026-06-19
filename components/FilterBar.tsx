"use client";

import { useSearch } from "@/components/store";
import { useLang } from "@/components/LangProvider";
import { translations } from "@/lib/i18n";
import { AIRLINE_LIST, type AirlineCode, type CarrierType } from "@/lib/airlines";

const CARRIER_TYPES: CarrierType[] = ["Legacy", "LCC"];
const TRIP_DAYS_MIN = 2;
const TRIP_DAYS_MAX = 21;

export default function FilterBar() {
  const { filters, setFilter, set, tripDaysEnabled, tripDays, journeyType } = useSearch();
  const { lang } = useLang();
  const t = translations[lang];

  const carrierLabels: Record<CarrierType, string> = {
    Legacy: t.fullService,
    LCC: t.lowCost,
  };

  const hasActiveFilters =
    filters.carrierTypes.length > 0 || filters.airlines.length > 0 || filters.tripDays !== null;

  function toggleCarrier(c: CarrierType) {
    setFilter({
      carrierTypes: filters.carrierTypes.includes(c)
        ? filters.carrierTypes.filter((x) => x !== c)
        : [...filters.carrierTypes, c],
    });
  }

  function toggleAirline(code: AirlineCode) {
    setFilter({
      airlines: filters.airlines.includes(code)
        ? filters.airlines.filter((x) => x !== code)
        : [...filters.airlines, code],
    });
  }

  function handleTripDaysToggle(enabled: boolean) {
    set({ tripDaysEnabled: enabled });
    setFilter({ tripDays: enabled ? tripDays : null });
  }

  function handleTripDaysChange(days: number) {
    set({ tripDays: days });
    setFilter({ tripDays: days });
  }

  function clearAll() {
    setFilter({ stops: "any", outboundMaxStops: "any", returnMaxStops: "any", carrierTypes: [], airlines: [], tripDays: null });
    set({ tripDaysEnabled: false });
  }

  return (
    <div className="rounded-xl border border-edge/50 bg-panel/60 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {t.filters}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] text-slate-500 transition-colors hover:text-rose-400"
          >
            {t.clearAllFilters}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {/* Carrier type */}
        <FilterRow label={t.carrier}>
          <PillGroup>
            {CARRIER_TYPES.map((c) => (
              <Pill key={c} active={filters.carrierTypes.includes(c)} onClick={() => toggleCarrier(c)}>
                {carrierLabels[c]}
              </Pill>
            ))}
          </PillGroup>
        </FilterRow>

        {/* Airlines */}
        <FilterRow label={t.airlines}>
          <div className="flex flex-wrap gap-1">
            {AIRLINE_LIST.map((a) => (
              <button
                key={a.code}
                type="button"
                title={`${a.name} · ${a.carrierType === "LCC" ? t.lowCost : a.alliance}`}
                onClick={() => toggleAirline(a.code)}
                className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold transition-all duration-150 ${
                  filters.airlines.includes(a.code)
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-edge bg-ink/40 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                <span className="font-bold">{a.code}</span>
                <span className="ml-1 opacity-60">{a.name}</span>
              </button>
            ))}
          </div>
        </FilterRow>

        {/* Trip Duration — only meaningful for round trips */}
        {journeyType === "Roundtrip" && (
          <FilterRow label="">
            <div className="w-full space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={tripDaysEnabled}
                  onChange={(e) => handleTripDaysToggle(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-edge bg-ink/60 accent-accent"
                />
                <span className="text-[11px] font-medium text-slate-300">
                  {t.tripDurationFilter}
                </span>
              </label>

              {tripDaysEnabled && (
                <div className="space-y-1.5 pl-5">
                  {/* Endpoint labels */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{t.tripDurationDays(TRIP_DAYS_MIN)}</span>
                    <span className="font-semibold text-accent">
                      {t.tripDurationDays(tripDays)}
                    </span>
                    <span>{t.tripDurationDays(TRIP_DAYS_MAX)}</span>
                  </div>
                  {/* Slider — fill track up to current thumb position */}
                  <input
                    type="range"
                    min={TRIP_DAYS_MIN}
                    max={TRIP_DAYS_MAX}
                    step={1}
                    value={tripDays}
                    onChange={(e) => handleTripDaysChange(Number(e.target.value))}
                    className="trip-duration-slider w-full cursor-pointer"
                    aria-label={t.tripDurationFilter}
                    style={{
                      background: `linear-gradient(to right, #38bdf8 ${((tripDays - TRIP_DAYS_MIN) / (TRIP_DAYS_MAX - TRIP_DAYS_MIN)) * 100}%, #1f2940 ${((tripDays - TRIP_DAYS_MIN) / (TRIP_DAYS_MAX - TRIP_DAYS_MIN)) * 100}%)`,
                    }}
                  />
                </div>
              )}
            </div>
          </FilterRow>
        )}
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-14 shrink-0 pt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function PillGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex rounded-lg border border-edge bg-ink/40 p-0.5">
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
        active ? "bg-accent text-ink shadow-sm" : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
