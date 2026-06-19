"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { translations } from "@/lib/i18n";

interface CalendarProps {
  depart?: string;
  ret?: string;
  onChange: (depart?: string, ret?: string) => void;
}

const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAYS_HE = ["ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳", "א׳"];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export default function Calendar({ depart, ret, onChange }: CalendarProps) {
  const { lang } = useLang();
  const t = translations[lang];
  const weekdays = lang === "he" ? WEEKDAYS_HE : WEEKDAYS_EN;

  const today = useMemo(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }, []);
  const [cursor, setCursor] = useState<Date>(
    depart ? new Date(`${depart}T00:00:00Z`) : today,
  );

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const monthLabel = cursor.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const todayIso = iso(today);

  // Monday-first leading blank count.
  const firstDow = (startOfMonth(year, month).getUTCDay() + 6) % 7;
  const total = daysInMonth(year, month);

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(iso(new Date(Date.UTC(year, month, d))));

  const handlePick = (date: string) => {
    if (!depart || (depart && ret)) {
      onChange(date, undefined);
    } else if (date < depart) {
      onChange(date, undefined);
    } else {
      onChange(depart, date);
    }
  };

  const inRange = (date: string) => depart && ret && date > depart && date < ret;

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}
          disabled={year === today.getUTCFullYear() && month === today.getUTCMonth()}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge text-slate-400 transition-all hover:border-accent/40 hover:bg-edge hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-100">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge text-slate-400 transition-all hover:border-accent/40 hover:bg-edge hover:text-white"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdays.map((w) => (
          <div key={w} className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} />;
          const past = date < todayIso;
          const isToday = date === todayIso;
          const isDepart = date === depart;
          const isReturn = date === ret;
          const ranged = inRange(date);
          return (
            <button
              key={date}
              type="button"
              disabled={past}
              onClick={() => handlePick(date)}
              aria-label={date}
              aria-pressed={isDepart || isReturn}
              className={[
                "relative h-8 rounded-lg text-sm transition-all duration-150",
                past ? "cursor-not-allowed text-slate-700" : "text-slate-200 hover:bg-edge",
                ranged ? "bg-accent/15 text-slate-100" : "",
                isDepart ? "bg-accent text-ink font-bold hover:bg-accent" : "",
                isReturn ? "bg-accent2 text-ink font-bold hover:bg-accent2" : "",
                isToday && !isDepart && !isReturn
                  ? "ring-1 ring-accent/50 text-accent font-semibold"
                  : "",
              ].join(" ")}
            >
              {parseInt(date.slice(8), 10)}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-accent" />
          {t.calendarDepart}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-accent2" />
          {t.calendarReturn}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded ring-1 ring-accent/50" />
          {t.calendarToday}
        </span>
        {(depart || ret) && (
          <button
            type="button"
            onClick={() => onChange(undefined, undefined)}
            className="ml-auto text-slate-600 underline transition hover:text-slate-300"
          >
            {t.calendarClear}
          </button>
        )}
      </div>
    </div>
  );
}
