"use client";

import { useMemo, useState } from "react";

interface CalendarProps {
  depart?: string;             // ISO date
  ret?: string;                // ISO date
  onChange: (depart?: string, ret?: string) => void;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Custom, dependency-free range calendar with separate depart/return dates.
export default function Calendar({ depart, ret, onChange }: CalendarProps) {
  const today = useMemo(() => {
    const t = new Date();
    return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  }, []);
  const [cursor, setCursor] = useState<Date>(
    depart ? new Date(`${depart}T00:00:00Z`) : today,
  );

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  // Monday-first leading blank count.
  const firstDow = (startOfMonth(year, month).getUTCDay() + 6) % 7;
  const total = daysInMonth(year, month);

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(iso(new Date(Date.UTC(year, month, d))));

  const handlePick = (date: string) => {
    // First click sets depart; second sets return; third restarts.
    if (!depart || (depart && ret)) {
      onChange(date, undefined);
    } else if (date < depart) {
      onChange(date, undefined);
    } else {
      onChange(depart, date);
    }
  };

  const inRange = (date: string) =>
    depart && ret && date > depart && date < ret;

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}
          disabled={year === today.getUTCFullYear() && month === today.getUTCMonth()}
          className="h-8 w-8 rounded-lg border border-edge text-slate-300 hover:bg-edge transition disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-100">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}
          className="h-8 w-8 rounded-lg border border-edge text-slate-300 hover:bg-edge transition"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-medium text-slate-500">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} />;
          const past = date < iso(today);
          const isDepart = date === depart;
          const isReturn = date === ret;
          const ranged = inRange(date);
          return (
            <button
              key={date}
              type="button"
              disabled={past}
              onClick={() => handlePick(date)}
              className={[
                "h-9 rounded-lg text-sm transition relative",
                past ? "text-slate-700 cursor-not-allowed" : "text-slate-200 hover:bg-edge",
                ranged ? "bg-accent/15" : "",
                isDepart ? "bg-accent text-ink font-bold hover:bg-accent" : "",
                isReturn ? "bg-accent2 text-ink font-bold hover:bg-accent2" : "",
              ].join(" ")}
            >
              {parseInt(date.slice(8), 10)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-accent inline-block" /> Depart
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-accent2 inline-block" /> Return
        </span>
        {(depart || ret) && (
          <button
            type="button"
            onClick={() => onChange(undefined, undefined)}
            className="ml-auto text-slate-500 hover:text-slate-200 underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
