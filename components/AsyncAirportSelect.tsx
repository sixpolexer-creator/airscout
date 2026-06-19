"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { translations } from "@/lib/i18n";
import type { AirportOption } from "@/lib/airport-types";
import {
  MACRO_REGIONS,
  type MacroRegion,
  type RegionId,
  isRegionId,
  regionById,
} from "@/lib/regions";

interface AsyncAirportSelectProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
}

type RegionOption = MacroRegion & { kind: "region" };
type DropdownOption = AirportOption | RegionOption;

function toRegionOpt(r: MacroRegion): RegionOption {
  return { ...r, kind: "region" };
}

export default function AsyncAirportSelect({ label, value, onChange }: AsyncAirportSelectProps) {
  const { lang } = useLang();
  const t = translations[lang];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [results, setResults] = useState<AirportOption[]>([]);
  const [selected, setSelected] = useState<AirportOption | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionOption | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId();
  const listboxId = `lb-${uid}`;
  const optId = (i: number) => `${listboxId}-opt-${i}`;

  // Regions filtered by current text query (empty text = show all).
  const regionOptions: RegionOption[] = text.length === 0
    ? MACRO_REGIONS.map(toRegionOpt)
    : MACRO_REGIONS
        .filter((r) => r.label.toLowerCase().includes(text.toLowerCase()))
        .map(toRegionOpt);

  // Unified flat list: regions first, then airport results.
  const allOptions: DropdownOption[] = [...regionOptions, ...results];

  // Resolve current value → display label.
  useEffect(() => {
    let cancelled = false;
    if (!value) { setSelected(null); setSelectedRegion(null); return; }

    // Region IDs resolve client-side — no API call needed.
    if (isRegionId(value)) {
      setSelectedRegion(toRegionOpt(regionById(value as RegionId)));
      setSelected(null);
      return;
    }

    setSelectedRegion(null);
    if (selected?.code === value.toUpperCase()) return;
    fetch(`/api/airports?code=${encodeURIComponent(value)}`)
      .then((r) => r.json())
      .then((list: AirportOption[]) => { if (!cancelled) setSelected(list[0] ?? null); })
      .catch(() => { if (!cancelled) setSelected(null); });
    return () => { cancelled = true; };
  }, [value, selected?.code]);

  // Debounced async airport search.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/airports?q=${encodeURIComponent(text)}`)
        .then((r) => r.json())
        .then((list: AirportOption[]) => { setResults(list); setHighlight(0); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 140);
    return () => clearTimeout(handle);
  }, [text, open]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Scroll highlighted option into view on keyboard navigation.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-optidx="${highlight}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const choose = (opt: DropdownOption) => {
    if (opt.kind === "region") {
      onChange(opt.id);
      setSelectedRegion(opt);
      setSelected(null);
    } else {
      onChange(opt.code);
      setSelected({ ...opt, name: opt.kind === "city" ? `${opt.city} (all airports)` : opt.name });
      setSelectedRegion(null);
    }
    setText("");
    setOpen(false);
  };

  const display = open
    ? text
    : selectedRegion
      ? `${selectedRegion.icon} ${selectedRegion.label}`
      : selected
        ? `${selected.code} — ${selected.city}`
        : value;

  const activeDescendant = open && allOptions[highlight] ? optId(highlight) : undefined;
  const showDropdown = open && (allOptions.length > 0 || loading || (text.length > 0 && !loading));

  return (
    <div className="relative" ref={wrapRef}>
      <span className="mb-1 block text-xs font-medium text-slate-400" id={`${listboxId}-label`}>
        {label}
      </span>
      <input
        className="input"
        value={display}
        placeholder={t.airportPlaceholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        aria-labelledby={`${listboxId}-label`}
        onFocus={() => { setOpen(true); setText(""); setHighlight(0); }}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, allOptions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (allOptions[highlight]) choose(allOptions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {showDropdown && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="airport-dropdown absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-edge bg-panel shadow-2xl lg:min-w-[380px] lg:overflow-x-hidden lg:overflow-y-auto"
        >
          {/* ── Region section ── */}
          {regionOptions.length > 0 && (
            <>
              <li className="px-3 pb-1 pt-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                  Destinations
                </span>
              </li>
              {regionOptions.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    id={optId(i)}
                    role="option"
                    aria-selected={i === highlight}
                    data-optidx={i}
                    onMouseDown={(e) => { e.preventDefault(); choose(r); }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                      i === highlight ? "bg-edge" : "hover:bg-edge/60"
                    }`}
                  >
                    <span className="text-base leading-none">{r.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-100">{r.label}</span>
                      <span className="ml-2 text-[11px] text-slate-500">{r.description}</span>
                    </span>
                    <span className="shrink-0 rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] font-bold text-accent2">
                      Region
                    </span>
                  </button>
                </li>
              ))}
              {/* Divider only when airports also appear */}
              {(loading || results.length > 0) && (
                <li className="my-1 border-t border-edge/60" aria-hidden="true" />
              )}
            </>
          )}

          {/* ── Airport section ── */}
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-500" aria-live="polite">
              Searching airports…
            </li>
          )}
          {!loading && results.length === 0 && text.length > 0 && regionOptions.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-500" aria-live="polite">
              No airports found for &ldquo;{text}&rdquo;
            </li>
          )}
          {results.map((a, i) => {
            const idx = regionOptions.length + i;
            return (
              <li key={`${a.kind}-${a.code}-${i}`}>
                <button
                  type="button"
                  id={optId(idx)}
                  role="option"
                  aria-selected={idx === highlight}
                  data-optidx={idx}
                  onMouseDown={(e) => { e.preventDefault(); choose(a); }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                    idx === highlight ? "bg-edge" : "hover:bg-edge/60"
                  } ${a.kind === "airport" ? "pl-5" : ""}`}
                >
                  <span className="min-w-0">
                    {a.kind === "city" ? (
                      <>
                        <span className="font-semibold text-slate-100">{a.city}</span>
                        <span className="ml-2 rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent2">
                          All airports · {a.airportCount}
                        </span>
                        <span className="ml-1 text-[11px] text-slate-600">{a.country}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-slate-200">{a.city}</span>
                        <span className="ml-2 text-xs text-slate-500">{a.name}</span>
                        <span className="ml-1 text-[11px] text-slate-600">· {a.country}</span>
                      </>
                    )}
                  </span>
                  <span className="shrink-0 rounded bg-ink/70 px-1.5 py-0.5 text-[11px] font-bold text-accent">
                    {a.code}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
