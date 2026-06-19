"use client";

import { useEffect, useRef, useState } from "react";
import { useSearch } from "@/components/store";
import { useLang } from "@/components/LangProvider";
import { translations } from "@/lib/i18n";
import { AIRLINE_LIST, type AirlineCode, type CarrierType } from "@/lib/airlines";

const CARRIER_TYPES: CarrierType[] = ["Legacy", "LCC"];
const TRIP_DAYS_MIN = 2;
const TRIP_DAYS_MAX = 21;
const DUR_FLEX_MAX = 7;

// Display region order. "South America" and "Central America" from the data
// are merged into a single "Americas" section for visual cleanliness.
const REGION_ORDER = [
  "Middle East",
  "Africa",
  "Europe",
  "North America",
  "Americas",
  "Asia",
  "Oceania",
] as const;
type DisplayRegion = (typeof REGION_ORDER)[number];

function toDisplayRegion(region: string | undefined): DisplayRegion | null {
  if (!region) return null;
  if (region === "South America" || region === "Central America") return "Americas";
  return REGION_ORDER.includes(region as DisplayRegion) ? (region as DisplayRegion) : null;
}

const AIRLINES_BY_REGION = REGION_ORDER.map((region) => ({
  region,
  airlines: AIRLINE_LIST.filter((a) => toDisplayRegion(a.region) === region),
})).filter((g) => g.airlines.length > 0);

export default function FilterBar() {
  const { filters, setFilter, set, tripDaysEnabled, tripDays, tripDurationFlex, journeyType } =
    useSearch();
  const { lang } = useLang();
  const t = translations[lang];

  const carrierLabels: Record<CarrierType, string> = {
    Legacy: t.fullService,
    LCC: t.lowCost,
  };

  const durMin = Math.max(1, tripDays - tripDurationFlex);
  const durMax = tripDays + tripDurationFlex;

  // All regions start collapsed; users expand only the ones they care about.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(AIRLINES_BY_REGION.map((g) => g.region)),
  );

  function toggleCollapse(region: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(region) ? next.delete(region) : next.add(region);
      return next;
    });
  }

  const hasActiveFilters =
    filters.carrierTypes.length > 0 || filters.airlines.length > 0 || filters.tripDaysMin !== null;

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

  // Select or deselect every airline in a region at once.
  // When selectAll=true, merges the region's codes into the current selection;
  // when false, removes them. Preserves codes from other regions unchanged.
  function toggleRegion(regionCodes: AirlineCode[], selectAll: boolean) {
    if (selectAll) {
      const merged = Array.from(new Set([...filters.airlines, ...regionCodes])) as AirlineCode[];
      setFilter({ airlines: merged });
    } else {
      setFilter({ airlines: filters.airlines.filter((c) => !regionCodes.includes(c)) });
    }
  }

  function handleTripDaysToggle(enabled: boolean) {
    set({ tripDaysEnabled: enabled });
    setFilter({
      tripDaysMin: enabled ? Math.max(1, tripDays - tripDurationFlex) : null,
      tripDaysMax: enabled ? tripDays + tripDurationFlex : null,
    });
  }

  function handleTripDaysChange(days: number) {
    set({ tripDays: days });
    setFilter({
      tripDaysMin: Math.max(1, days - tripDurationFlex),
      tripDaysMax: days + tripDurationFlex,
    });
  }

  function handleDurFlexChange(flex: number) {
    set({ tripDurationFlex: flex });
    setFilter({
      tripDaysMin: Math.max(1, tripDays - flex),
      tripDaysMax: tripDays + flex,
    });
  }

  function clearAll() {
    setFilter({
      stops: "any",
      outboundMaxStops: "any",
      returnMaxStops: "any",
      carrierTypes: [],
      airlines: [],
      tripDaysMin: null,
      tripDaysMax: null,
    });
    set({ tripDaysEnabled: false });
  }

  return (
    <div className="rounded-xl border border-edge/50 bg-panel/60 px-4 py-3">
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

      <div className="space-y-2">
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

        {/* Airlines — grouped by region with trilateral parent checkboxes.
            Empty selection = all airlines pass (see passesFilters in DealFeed). */}
        <FilterRow label={t.airlines}>
          <div className="space-y-2.5">
            {AIRLINES_BY_REGION.map(({ region, airlines }) => {
              const regionCodes = airlines.map((a) => a.code);
              const selectedCount = regionCodes.filter((c) =>
                filters.airlines.includes(c),
              ).length;
              const allSelected = selectedCount === regionCodes.length;
              const someSelected = selectedCount > 0 && !allSelected;

              return (
                <div key={region}>
                  <div className="mb-1 flex items-center gap-1.5">
                    <RegionCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={(checked) => toggleRegion(regionCodes, checked)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleCollapse(region)}
                      className="flex flex-1 items-center gap-1.5 text-left"
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                        {region}
                      </span>
                      {selectedCount > 0 && collapsed.has(region) && (
                        <span className="rounded-full bg-accent/20 px-1.5 text-[8px] font-bold text-accent/70">
                          {selectedCount}
                        </span>
                      )}
                      <span className="ml-auto text-[9px] text-slate-700">
                        {collapsed.has(region) ? "▸" : "▾"}
                      </span>
                    </button>
                  </div>
                  {!collapsed.has(region) && (
                    <div className="flex flex-wrap gap-1">
                      {airlines.map((a) => (
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
                  )}
                </div>
              );
            })}
          </div>
        </FilterRow>

        {/* Trip Duration — top-level row, always visible for round trips */}
        {journeyType === "Roundtrip" && (
          <FilterRow label={t.tripDurationFilter}>
            <div className="w-full space-y-2">
              {/* Activation checkbox — always interactive */}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={tripDaysEnabled}
                  onChange={(e) => handleTripDaysToggle(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-edge bg-ink/60 accent-accent"
                />
                <span className="text-[10px] font-normal text-accent/80">
                  {tripDaysEnabled
                    ? `${t.tripDurationDays(tripDays)}${tripDurationFlex > 0 ? ` (${t.tripDurationFlexRange(durMin, durMax)})` : ""}`
                    : <span className="text-slate-600">{t.tripDurationDays(tripDays)}</span>}
                </span>
              </label>

              {/* Controls — always rendered; dimmed and blocked until activated */}
              <div
                className={`space-y-2 transition-opacity duration-150 ${
                  tripDaysEnabled ? "opacity-100" : "pointer-events-none opacity-40"
                }`}
              >
                {/* Trip-duration slider */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{t.tripDurationDays(TRIP_DAYS_MIN)}</span>
                    <span className="font-semibold text-accent">
                      {t.tripDurationDays(tripDays)}
                    </span>
                    <span>{t.tripDurationDays(TRIP_DAYS_MAX)}</span>
                  </div>
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
                      background: (() => {
                        const pct = ((tripDays - TRIP_DAYS_MIN) / (TRIP_DAYS_MAX - TRIP_DAYS_MIN)) * 100;
                        const dir = lang === "he" ? "to left" : "to right";
                        return `linear-gradient(${dir}, #38bdf8 ${pct}%, #1f2940 ${pct}%)`;
                      })(),
                    }}
                  />
                </div>

                {/* Duration-flexibility ±N control — decoupled from calendar flex */}
                <div className="flex items-center gap-2 rounded-lg border border-edge/60 bg-ink/30 px-2 py-1.5">
                  <span className="flex-1 text-[10px] text-slate-500">{t.durFlexLabel}</span>
                  <button
                    type="button"
                    onClick={() => handleDurFlexChange(Math.max(0, tripDurationFlex - 1))}
                    disabled={tripDurationFlex === 0}
                    className="flex h-5 w-5 items-center justify-center rounded border border-edge text-xs text-slate-400 transition-colors hover:border-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-[11px] font-semibold text-accent">
                    ±{tripDurationFlex}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDurFlexChange(Math.min(DUR_FLEX_MAX, tripDurationFlex + 1))}
                    disabled={tripDurationFlex === DUR_FLEX_MAX}
                    className="flex h-5 w-5 items-center justify-center rounded border border-edge text-xs text-slate-400 transition-colors hover:border-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </FilterRow>
        )}
      </div>
    </div>
  );
}

// Checkbox that supports the indeterminate (partial-selection) state.
// React does not expose the indeterminate property as a JSX attribute,
// so we write it directly onto the DOM element via a ref after each render.
function RegionCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-3 w-3 cursor-pointer accent-accent"
    />
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { lang } = useLang();
  return (
    <div className="flex items-start gap-3">
      <span
        className={`shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-500 ${
          lang === "ru" ? "w-36 break-words" : "w-14"
        }`}
      >
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

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
