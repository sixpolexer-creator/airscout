"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Lang, langMeta } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const meta = langMeta[lang];
    document.documentElement.dir = meta.dir;
    document.documentElement.lang = lang;
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

const LANGS: { code: Lang; flag: string; asset: string }[] = [
  { code: "en", flag: "🇺🇸", asset: "/USA-64.png" },
  { code: "he", flag: "🇮🇱", asset: "/israel-64.png" },
  { code: "ru", flag: "🇷🇺", asset: "/russia-64.png" },
];

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex rounded-lg border border-edge bg-ink/50 p-0.5" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-label={langMeta[l.code].label}
          aria-pressed={lang === l.code}
          className={`min-w-[38px] rounded-md px-1.5 py-1 leading-none transition-all duration-150 ${
            lang === l.code
              ? "bg-accent shadow-sm"
              : "opacity-50 hover:opacity-80"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={l.asset} alt={langMeta[l.code].label} width={24} height={24} className="h-6 w-6 rounded-sm object-cover" />
        </button>
      ))}
    </div>
  );
}
