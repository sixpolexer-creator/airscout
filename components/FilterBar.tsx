"use client";

import { useSearch, type StopsFilter } from "@/components/store";
import { AIRLINE_LIST, ALLIANCES, type AirlineCode, type Alliance, type CarrierType } from "@/lib/airlines";
import { CURRENCY_LIST, type CurrencyCode } from "@/lib/currency";

const STOPS: { value: StopsFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "1stop", label: "≤1 stop" },
  { value: "direct", label: "Direct" },
];

const CARRIER_TYPES: { value: CarrierType; label: string }[] = [
  { value: "Legacy", label: "Full-service" },
  { value: "LCC", label: "Low-cost" },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function FilterBar() {
  const { currency, filters, set, setFilter } = useSearch();

  return (
    <div className="space-y-4 rounded-2xl border border-edge bg-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-100">Filters</h3>
        {/* Currency engine */}
        <Segmented<CurrencyCode>
          options={CURRENCY_LIST.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}` }))}
          value={currency}
          onChange={(c) => set({ currency: c })}
        />
      </div>

      <Row label="Stops">
        <Segmented<StopsFilter>
          options={STOPS}
          value={filters.stops}
          onChange={(v) => setFilter({ stops: v })}
        />
      </Row>

      <Row label="Carrier">
        <div className="flex flex-wrap gap-2">
          {CARRIER_TYPES.map((c) => (
            <Chip
              key={c.value}
              active={filters.carrierTypes.includes(c.value)}
              onClick={() => setFilter({ carrierTypes: toggle(filters.carrierTypes, c.value) })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </Row>

      <Row label="Alliance">
        <div className="flex flex-wrap gap-2">
          {ALLIANCES.map((a) => (
            <Chip
              key={a}
              active={filters.alliances.includes(a)}
              onClick={() => setFilter({ alliances: toggle(filters.alliances, a) })}
            >
              {a === "None" ? "Unallied" : a}
            </Chip>
          ))}
        </div>
      </Row>

      <Row label="Airlines">
        <div className="flex flex-wrap gap-2">
          {AIRLINE_LIST.map((a) => (
            <Chip
              key={a.code}
              active={filters.airlines.includes(a.code)}
              onClick={() => setFilter({ airlines: toggle(filters.airlines, a.code) })}
              title={`${a.name} · ${a.carrierType === "LCC" ? "Low-cost" : a.alliance}`}
            >
              <span className="font-bold">{a.code}</span>
              <span className="ml-1 hidden text-[10px] opacity-70 sm:inline">{a.name}</span>
            </Chip>
          ))}
        </div>
      </Row>

      {(filters.stops !== "any" ||
        filters.outboundMaxStops !== "any" ||
        filters.returnMaxStops !== "any" ||
        filters.alliances.length > 0 ||
        filters.carrierTypes.length > 0 ||
        filters.airlines.length > 0) && (
        <button
          type="button"
          onClick={() =>
            setFilter({
              stops: "any",
              outboundMaxStops: "any",
              returnMaxStops: "any",
              alliances: [],
              carrierTypes: [],
              airlines: [],
            })
          }
          className="text-xs text-slate-500 underline hover:text-slate-200"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <span className="w-20 shrink-0 pt-1.5 text-xs font-medium text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-edge bg-ink/50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            value === o.value ? "bg-accent text-ink" : "text-slate-300 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-edge bg-ink/40 text-slate-300 hover:border-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
