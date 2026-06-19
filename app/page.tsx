"use client";

import Link from "next/link";
import SearchForm from "@/components/SearchForm";
import DealFeed from "@/components/DealFeed";
import FilterBar from "@/components/FilterBar";
import { LangToggle, useLang } from "@/components/LangProvider";
import { translations } from "@/lib/i18n";
import { useSearch } from "@/components/store";
import { CURRENCY_LIST } from "@/lib/currency";
import LogoImage from "@/components/LogoImage";

export default function Home() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 left-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[130px]" />
        <div className="absolute top-1/3 right-0 h-[420px] w-[420px] translate-x-1/3 rounded-full bg-accent2/[0.05] blur-[110px]" />
        <div className="absolute bottom-10 left-1/3 h-[320px] w-[320px] rounded-full bg-good/[0.04] blur-[100px]" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl px-4 py-10 xl:max-w-7xl xl:px-8 2xl:max-w-[1600px] 2xl:px-12 2xl:py-12">
        <header className="mb-8 2xl:mb-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoImage
                src="/logo3.png"
                alt="AirScout"
                className="h-20 w-auto object-contain xl:h-24 2xl:h-28 drop-shadow-[0_0_12px_rgba(56,189,248,0.25)]"
              />
            </div>
            <HeaderControls />
          </div>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-400 xl:text-base">
            {t.subtitle}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 2xl:gap-12">
          <section className="space-y-6 lg:col-span-2 lg:sticky lg:top-8 lg:self-start">
            <SearchForm />
            <FilterBar />
          </section>
          <section className="lg:col-span-3">
            <DealFeed />
          </section>
        </div>
      </main>
    </div>
  );
}

function HeaderControls() {
  const s = useSearch();
  return (
    <div className="mt-1 flex w-[118px] shrink-0 flex-col items-stretch gap-1.5" dir="ltr">
      <LangToggle />
      <div className="flex w-full rounded-lg border border-edge bg-ink/50 p-0.5">
        {CURRENCY_LIST.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => s.set({ currency: c.code })}
            className={`flex h-9 flex-1 flex-col items-center justify-center gap-px rounded-md transition-all duration-150 ${
              s.currency === c.code
                ? "bg-accent text-ink shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="text-sm font-bold leading-none">{c.symbol}</span>
            <span className="text-[9px] font-semibold leading-none tracking-wide">{c.code}</span>
          </button>
        ))}
      </div>
      <Link
        href="/intel"
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-edge/70 bg-panel/40 px-3 text-[11px] font-semibold text-slate-400 transition-all hover:border-accent2/40 hover:bg-accent2/5 hover:text-accent2"
      >
        <span className="text-accent2">◎</span> Intel Hub
      </Link>
    </div>
  );
}
