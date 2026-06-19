"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLang, LangToggle } from "@/components/LangProvider";
import { langMeta } from "@/lib/i18n";
import LogoImage from "@/components/LogoImage";

type Region = "ALL" | "MENA" | "EuropeWSN" | "EuropeCIS" | "Americas" | "AsiaPac";

const CARRIERS = [
  { region: "MENA",      name: "EL AL",              country: "Israel",      hub: "TLV", alliance: "Independent",      model: "Scheduled Flag Carrier" },
  { region: "MENA",      name: "Emirates",            country: "UAE",         hub: "DXB", alliance: "Independent",      model: "Scheduled Global Network" },
  { region: "MENA",      name: "Etihad Airways",      country: "UAE",         hub: "AUH", alliance: "Independent",      model: "Scheduled Global Network" },
  { region: "MENA",      name: "flydubai",            country: "UAE",         hub: "DXB", alliance: "Low-Cost Carrier", model: "Scheduled LCC" },
  { region: "MENA",      name: "Qatar Airways",       country: "Qatar",       hub: "DOH", alliance: "oneworld",         model: "Scheduled Global Network" },
  { region: "MENA",      name: "Saudia",              country: "Saudi Arabia",hub: "JED", alliance: "SkyTeam",          model: "Scheduled Flag Carrier" },
  { region: "MENA",      name: "Air Haifa",           country: "Israel",      hub: "HFA", alliance: "Regional Carrier", model: "Point-to-Point Turboprop" },
  { region: "EuropeWSN", name: "TUS Airways",         country: "Cyprus",      hub: "LCA", alliance: "Regional Carrier", model: "Regional Scheduled" },
  { region: "EuropeWSN", name: "Lufthansa",           country: "Germany",     hub: "FRA", alliance: "Star Alliance",    model: "Star Alliance Hub-and-Spoke" },
  { region: "EuropeWSN", name: "British Airways",     country: "UK",          hub: "LHR", alliance: "oneworld",         model: "Scheduled Flag Carrier" },
  { region: "EuropeWSN", name: "Ryanair",             country: "Ireland",     hub: "DUB", alliance: "Low-Cost Carrier", model: "Ultra LCC" },
  { region: "EuropeCIS", name: "Wizz Air",            country: "Hungary",     hub: "BUD", alliance: "Low-Cost Carrier", model: "Scheduled LCC" },
  { region: "EuropeCIS", name: "LOT Polish",          country: "Poland",      hub: "WAW", alliance: "Star Alliance",    model: "Scheduled Flag Carrier" },
  { region: "EuropeCIS", name: "FlyOne",              country: "Moldova",     hub: "KIV", alliance: "Low-Cost Carrier", model: "Regional LCC" },
  { region: "EuropeCIS", name: "Uzbekistan Airways",  country: "Uzbekistan",  hub: "TAS", alliance: "Independent",      model: "Scheduled Flag Carrier" },
  { region: "Americas",  name: "American Airlines",   country: "USA",         hub: "DFW", alliance: "oneworld",         model: "Scheduled Global Network" },
  { region: "Americas",  name: "Delta Air Lines",     country: "USA",         hub: "ATL", alliance: "SkyTeam",          model: "Scheduled Global Network" },
  { region: "Americas",  name: "Copa Airlines",       country: "Panama",      hub: "PTY", alliance: "Star Alliance",    model: "Hub of the Americas" },
  { region: "AsiaPac",   name: "Singapore Airlines",  country: "Singapore",   hub: "SIN", alliance: "Star Alliance",    model: "Scheduled Premium Network" },
  { region: "AsiaPac",   name: "Cathay Pacific",      country: "Hong Kong",   hub: "HKG", alliance: "oneworld",         model: "Scheduled Premium Network" },
  { region: "AsiaPac",   name: "IndiGo",              country: "India",       hub: "DEL", alliance: "Low-Cost Carrier", model: "Dominant Indian LCC" },
  { region: "AsiaPac",   name: "Qantas",              country: "Australia",   hub: "SYD", alliance: "oneworld",         model: "Scheduled Global Network" },
];

const ALLIANCE_IDS = ["all", "Star Alliance", "oneworld", "SkyTeam", "Low-Cost Carrier", "Regional Carrier", "Independent"];

const modelCounts = CARRIERS.reduce(
  (acc, c) => {
    if (c.model.includes("Flag")) acc.flag++;
    else if (c.model.includes("Network") || c.model.includes("Spoke")) acc.network++;
    else if (c.model.includes("LCC")) acc.lcc++;
    else acc.regional++;
    return acc;
  },
  { flag: 0, network: 0, lcc: 0, regional: 0 },
);

const BAR_DATA = [
  { label: "MENA",         count: CARRIERS.filter(c => c.region === "MENA").length,       color: "#38bdf8" },
  { label: "Europe (WSN)", count: CARRIERS.filter(c => c.region === "EuropeWSN").length,  color: "#a78bfa" },
  { label: "Europe (CIS)", count: CARRIERS.filter(c => c.region === "EuropeCIS").length,  color: "#a78bfa" },
  { label: "Americas",     count: CARRIERS.filter(c => c.region === "Americas").length,   color: "#34d399" },
  { label: "Asia-Pacific", count: CARRIERS.filter(c => c.region === "AsiaPac").length,    color: "#38bdf8" },
];
const BAR_MAX = Math.max(...BAR_DATA.map(d => d.count));

const IT = {
  en: {
    nodeVer: "Global Intel Node v4.2",
    liveFeed: "Operational Live Feed",
    back: "← Back to Search",
    heroTitle: "Aviation Intelligence Hub",
    heroDesc: "Real-time visualization, economic indices, and structured datasets representing cross-border aviation lanes. Filter commercial channels, calculate fleet payloads, and analyze global transit parameters.",
    scoutDir: "✈ Scout Directory",
    s1l: "Active Global Carriers",  s1s: "100% Booking Viable",
    s2l: "Average Ticket Access",   s2s: "Cross-Border Travel",
    s3l: "Integrated Alliances",    s3s: "oneworld · Star · Sky",
    s4l: "Excluded Nodes",          s4s: "Ceased / ACMI B2B",
    modelsTitle: "Active Carrier Models",
    modelsDesc: "Classification of currently integrated flight platforms",
    flagCarrier: "Flag Carrier", networkHub: "Network / Hub", lcc: "Low-Cost (LCC)", regional: "Regional",
    dispTitle: "Active Regional Dispersion",
    dispDesc: "Regional deployment concentrations for booking platforms",
    rAll: "All Regions", rMENA: "Middle East & Africa", rEWSN: "W. & N. Europe",
    rECIS: "E. Europe & CIS", rAm: "The Americas", rAP: "Asia-Pacific",
    dirTitle: "Live Airline Scouter",
    dirDesc: "Real-time status tracking of functional global carriers allowing direct ticketing.",
    filterPh: "Filter carrier, code, country…",
    allAlliances: "All Alliances",
    thHub: "Hub", thCarrier: "Carrier & Country", thAlliance: "Alliance & Model",
    thCoverage: "Coverage", thTicketing: "Ticketing",
    noCarriers: "NO CARRIERS MATCHING SEARCH PARAMS DETECTED",
    globalBadge: "⊕ Global", ticketBadge: "✓ Direct Ticketing",
    csTitle: "Point-to-Point Carrier Architecture",
    csBadge: "Case Study",
    csLabel: "Micro-Scale Carrier: Air Haifa (Active)",
    csDesc: "Air Haifa deploys ultra-efficient regional turboprops (ATR 72-600) to feed high-frequency routes directly bypassing congested regional hubs, facilitating cross-border flights into Cyprus (Larnaca/Paphos) and Southern Europe.",
    corridor: "Core Target Corridor", payload: "Payload Matrix",
    calcTitle: "Economic Formula Engine", calcBadge: "System Formula",
    plfTitle: "Passenger Load Factor (PLF)",
    plfDesc: "Deployment efficacy of seat-capacity km vs revenue km.",
    rpkLabel: "RPK (Revenue Passenger KM)", askLabel: "ASK (Available Seat KM)",
    efficacy: "Computed Flight Efficacy",
    footer: "© 2026 AirScout · Tactical Aviation Routing Architecture · Data feed updated continuously.",
  },
  he: {
    nodeVer: "מרכז מודיעין עולמי v4.2",
    liveFeed: "עדכון חי: פעיל",
    back: "חזרה לחיפוש →",
    heroTitle: "מרכז המודיעין התעופתי",
    heroDesc: "ויזואליזציה בזמן אמת, מדדים כלכליים ומסדי נתונים מובנים המייצגים מסלולי תעופה חוצי גבולות. סנן ערוצים מסחריים, חשב עומסי צי ונתח פרמטרי מעבר עולמיים.",
    scoutDir: "✈ ספריית חברות",
    s1l: "חברות תעופה פעילות",    s1s: "100% זמינות הזמנה",
    s2l: "נגישות כרטוס ממוצעת",   s2s: "טיסות בינלאומיות",
    s3l: "ברית תעופה משולבת",      s3s: "oneworld · Star · Sky",
    s4l: "צמתים מוחרגים",          s4s: "פסקו / ACMI B2B",
    modelsTitle: "מודלים של חברות פעילות",
    modelsDesc: "סיווג פלטפורמות הטיסה המשולבות כרגע",
    flagCarrier: "חברת דגל", networkHub: "רשת / צומת", lcc: "חברה זולה (LCC)", regional: "אזורית",
    dispTitle: "פיזור אזורי פעיל",
    dispDesc: "ריכוז פריסה אזורית של פלטפורמות ההזמנה",
    rAll: "כל האזורים", rMENA: "המזרח התיכון ואפריקה", rEWSN: "מערב וצפון אירופה",
    rECIS: "מזרח אירופה ו-CIS", rAm: "אמריקה", rAP: "אסיה-פסיפיק",
    dirTitle: "סריקת חברות תעופה בזמן אמת",
    dirDesc: "מעקב סטטוס בזמן אמת על חברות תעופה עולמיות המאפשרות הזמנה ישירה.",
    filterPh: "סנן חברה, קוד, מדינה…",
    allAlliances: "כל הבריתות",
    thHub: "צומת", thCarrier: "חברה ומדינה", thAlliance: "ברית ומודל",
    thCoverage: "כיסוי", thTicketing: "הזמנה",
    noCarriers: "לא נמצאו חברות תואמות פרמטרי החיפוש",
    globalBadge: "⊕ עולמי", ticketBadge: "✓ הזמנה ישירה",
    csTitle: "ארכיטקטורת חברה נקודה לנקודה",
    csBadge: "מקרה בוחן",
    csLabel: "חברה קטנת-היקף: אייר חיפה (פעילה)",
    csDesc: "אייר חיפה מפעילה מטוסי טורבו-פרופ אזוריים (ATR 72-600) בנתיבים תדירים המעקפים צמתים אזוריים עמוסים, ומאפשרים טיסות חוצות גבולות לקפריסין (לרנקה/פאפוס) ולדרום אירופה.",
    corridor: "מסלול יעד מרכזי", payload: "מטריצת עומס",
    calcTitle: "מנוע נוסחאות כלכלי", calcBadge: "נוסחת מערכת",
    plfTitle: "מקדם עומס נוסעים (PLF)",
    plfDesc: 'יעילות פריסת ק"מ קיבולת מושב לעומת ק"מ הכנסה.',
    rpkLabel: 'RPK (ק"מ נוסעים מניבים)', askLabel: 'ASK (ק"מ מושבים זמינים)',
    efficacy: "יעילות טיסה מחושבת",
    footer: "© 2026 AirScout · ארכיטקטורת ניתוב תעופתית טקטית · עדכון נתונים רציף.",
  },
  ru: {
    nodeVer: "Глобальный узел разведки v4.2",
    liveFeed: "Прямой эфир: активен",
    back: "← Вернуться к поиску",
    heroTitle: "Центр авиационной аналитики",
    heroDesc: "Визуализация в реальном времени, экономические индексы и структурированные данные по международным авиационным маршрутам. Фильтруйте коммерческие каналы, рассчитывайте загрузку флота и анализируйте глобальные транзитные параметры.",
    scoutDir: "✈ Каталог авиакомпаний",
    s1l: "Активные перевозчики",      s1s: "100% доступны для бронирования",
    s2l: "Средний доступ к билетам",  s2s: "Международные перелёты",
    s3l: "Интегрированные альянсы",   s3s: "oneworld · Star · Sky",
    s4l: "Исключённые узлы",          s4s: "Прекратили работу / ACMI B2B",
    modelsTitle: "Активные модели перевозчиков",
    modelsDesc: "Классификация интегрированных авиаплатформ",
    flagCarrier: "Флагман", networkHub: "Сетевой / Хаб", lcc: "Лоукостер (LCC)", regional: "Региональный",
    dispTitle: "Активное региональное распределение",
    dispDesc: "Региональная концентрация перевозчиков по платформам бронирования",
    rAll: "Все регионы", rMENA: "Ближний Восток и Африка", rEWSN: "Зап. и Сев. Европа",
    rECIS: "Вост. Европа и СНГ", rAm: "Америка", rAP: "Азиатско-Тихоокеанский",
    dirTitle: "Сканер авиакомпаний в реальном времени",
    dirDesc: "Мониторинг статуса действующих мировых перевозчиков с прямым бронированием.",
    filterPh: "Фильтр по перевозчику, коду, стране…",
    allAlliances: "Все альянсы",
    thHub: "Хаб", thCarrier: "Компания и страна", thAlliance: "Альянс и модель",
    thCoverage: "Охват", thTicketing: "Бронирование",
    noCarriers: "ПЕРЕВОЗЧИКИ ПО ЗАДАННЫМ ПАРАМЕТРАМ НЕ НАЙДЕНЫ",
    globalBadge: "⊕ Глобальный", ticketBadge: "✓ Прямое бронирование",
    csTitle: "Архитектура прямого сообщения",
    csBadge: "Кейс",
    csLabel: "Малый перевозчик: Air Haifa (активен)",
    csDesc: "Air Haifa использует сверхэффективные региональные турбовинтовые самолёты (ATR 72-600) на высокочастотных маршрутах в обход загруженных хабов, выполняя трансграничные рейсы на Кипр (Ларнака/Пафос) и в Южную Европу.",
    corridor: "Основной целевой коридор", payload: "Матрица загрузки",
    calcTitle: "Экономический калькулятор", calcBadge: "Системная формула",
    plfTitle: "Коэффициент пассажирской загрузки (PLF)",
    plfDesc: "Эффективность использования кресло-км против доходных пассажиро-км.",
    rpkLabel: "RPK (доходные пассажиро-км)", askLabel: "ASK (доступные кресло-км)",
    efficacy: "Расчётная эффективность рейса",
    footer: "© 2026 AirScout · Архитектура тактической авиационной маршрутизации · Данные обновляются непрерывно.",
  },
} as const;

export default function IntelPage() {
  const { lang } = useLang();
  const t = IT[lang];
  const dir = langMeta[lang].dir;

  const [region, setRegion]     = useState<Region>("ALL");
  const [query, setQuery]       = useState("");
  const [alliance, setAlliance] = useState("all");
  const [rpk, setRpk]           = useState(48000);
  const [ask, setAsk]           = useState(60000);

  const plf = ask > 0 ? ((rpk / ask) * 100).toFixed(2) : "0.00";

  const REGION_TABS = [
    { id: "ALL" as Region,       label: t.rAll  },
    { id: "MENA" as Region,      label: t.rMENA },
    { id: "EuropeWSN" as Region, label: t.rEWSN },
    { id: "EuropeCIS" as Region, label: t.rECIS },
    { id: "Americas" as Region,  label: t.rAm   },
    { id: "AsiaPac" as Region,   label: t.rAP   },
  ];

  const DONUT_SEGMENTS = [
    { label: t.flagCarrier, value: modelCounts.flag,     color: "#a78bfa" },
    { label: t.networkHub,  value: modelCounts.network,  color: "#38bdf8" },
    { label: t.lcc,         value: modelCounts.lcc,      color: "#22d3ee" },
    { label: t.regional,    value: modelCounts.regional, color: "#475569" },
  ];

  const filtered = useMemo(
    () =>
      CARRIERS.filter(c => {
        const matchRegion   = region === "ALL" || c.region === region;
        const matchQuery    = !query || c.name.toLowerCase().includes(query) || c.hub.toLowerCase().includes(query) || c.country.toLowerCase().includes(query);
        const matchAlliance = alliance === "all" || c.alliance.includes(alliance);
        return matchRegion && matchQuery && matchAlliance;
      }),
    [region, query, alliance],
  );

  return (
    <div dir={dir} className="relative min-h-screen overflow-x-hidden bg-ink pb-16 text-slate-200">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 left-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[130px]" />
        <div className="absolute top-1/3 right-0 h-[420px] w-[420px] translate-x-1/3 rounded-full bg-accent2/[0.05] blur-[110px]" />
        <div className="absolute bottom-10 left-1/3 h-[320px] w-[320px] rounded-full bg-good/[0.04] blur-[100px]" />
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b border-edge bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <LogoImage src="/logo3.png" alt="AirScout" className="h-8 w-auto object-contain" />
            <span className="hidden text-[9px] font-mono uppercase tracking-widest text-slate-500 sm:inline">
              {t.nodeVer}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <span className="hidden items-center gap-1.5 rounded-full border border-good/20 bg-good/10 px-2.5 py-0.5 text-[11px] font-medium text-good sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-good opacity-75" />
                <span className="h-2 w-2 rounded-full bg-good" />
              </span>
              {t.liveFeed}
            </span>
            <Link href="/" className="rounded-lg border border-edge px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-accent/40 hover:text-accent">
              {t.back}
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="rounded-2xl border border-edge bg-panel/60 p-6 md:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{t.heroTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">{t.heroDesc}</p>
          <a href="#directory" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 px-5 py-2.5 text-xs font-semibold text-ink shadow-glow-accent transition-opacity hover:opacity-90">
            {t.scoutDir}
          </a>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t.s1l, value: `${CARRIERS.length}`, sub: t.s1s, accent: "border-accent2",  text: "text-accent2"  },
            { label: t.s2l, value: "100%",               sub: t.s2s, accent: "border-accent",   text: "text-accent"   },
            { label: t.s3l, value: "3",                  sub: t.s3s, accent: "border-cyan-400", text: "text-cyan-400" },
            { label: t.s4l, value: "2",                  sub: t.s4s, accent: "border-amber-400",text: "text-amber-400"},
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border border-edge bg-panel/60 p-5 border-l-4 ${s.accent}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-white">{s.value}</span>
                <span className={`font-mono text-xs ${s.text}`}>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-edge bg-panel/60 p-6">
            <p className="mb-1 text-base font-bold text-white">{t.modelsTitle}</p>
            <p className="mb-5 text-xs text-slate-400">{t.modelsDesc}</p>
            <div className="flex items-center gap-6">
              <DonutChart segments={DONUT_SEGMENTS} total={CARRIERS.length} />
              <ul className="space-y-2">
                {DONUT_SEGMENTS.map(s => (
                  <li key={s.label} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="text-slate-400">{s.label}</span>
                    <span className="ml-auto font-mono font-bold text-white">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-2xl border border-edge bg-panel/60 p-6">
            <p className="mb-1 text-base font-bold text-white">{t.dispTitle}</p>
            <p className="mb-5 text-xs text-slate-400">{t.dispDesc}</p>
            <div className="space-y-3">
              {BAR_DATA.map(d => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-right text-[10px] text-slate-400">{d.label}</span>
                  <div className="flex-1 rounded-full bg-edge/60 overflow-hidden h-4">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.count / BAR_MAX) * 100}%`, background: d.color }} />
                  </div>
                  <span className="w-5 text-right font-mono text-xs font-bold text-white">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Directory */}
        <section id="directory" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <span className="text-accent">◎</span> {t.dirTitle}
              </h2>
              <p className="mt-1 text-xs text-slate-400">{t.dirDesc}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 md:w-56">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-xs">⌕</span>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value.toLowerCase())}
                  placeholder={t.filterPh}
                  className="input pl-7 text-xs"
                />
              </div>
              <select
                value={alliance}
                onChange={e => setAlliance(e.target.value)}
                className="rounded-xl border border-edge bg-ink/80 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {ALLIANCE_IDS.map(a => (
                  <option key={a} value={a}>{a === "all" ? t.allAlliances : a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Region tabs */}
          <div className="flex flex-wrap gap-2 border-b border-edge pb-2">
            {REGION_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRegion(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  region === tab.id
                    ? "bg-edge text-accent border border-accent/20 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-edge bg-panel/60">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-edge bg-ink/40">
                  {[t.thHub, t.thCarrier, t.thAlliance, t.thCoverage, t.thTicketing].map(h => (
                    <th key={h} className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/40">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center font-mono text-xs text-slate-500">
                      {t.noCarriers}
                    </td>
                  </tr>
                ) : filtered.map(c => (
                  <tr key={`${c.name}-${c.hub}`} className="transition-colors hover:bg-panel/40">
                    <td className="p-4">
                      <span className="rounded-md border border-accent/10 bg-accent/5 px-2 py-1 font-mono text-xs font-bold text-accent">
                        {c.hub}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-bold text-white">{c.name}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">{c.country}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-200">{c.alliance}</div>
                      <div className="mt-0.5 font-mono text-[9px] text-slate-500">{c.model}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent2/10 bg-accent2/10 px-2 py-0.5 text-[9px] font-bold text-accent2">
                        {t.globalBadge}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full border border-good/10 bg-good/10 px-2 py-0.5 text-[9px] font-bold text-good">
                        {t.ticketBadge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Case study + Calculator */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-edge bg-panel/60 p-6">
            <div className="mb-4 flex items-center justify-between border-b border-edge pb-3">
              <h3 className="text-base font-bold text-white">{t.csTitle}</h3>
              <span className="font-mono text-xs text-amber-400">{t.csBadge}</span>
            </div>
            <div className="rounded-xl border border-edge bg-ink/30 p-4">
              <span className="mb-1 block text-xs font-bold text-accent">{t.csLabel}</span>
              <p className="text-xs leading-relaxed text-slate-300">{t.csDesc}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: t.corridor, value: "HFA → LCA, PFO, ATH" },
                { label: t.payload,  value: "ATR-72 High Efficiency" },
              ].map(d => (
                <div key={d.label} className="rounded-lg border border-edge bg-ink/20 p-3">
                  <span className="block text-[10px] uppercase tracking-wide text-slate-400">{d.label}</span>
                  <span className="mt-1 block text-xs font-bold text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-edge bg-panel/60 p-6">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-edge pb-3">
                <h3 className="text-base font-bold text-white">{t.calcTitle}</h3>
                <span className="font-mono text-xs text-accent2">{t.calcBadge}</span>
              </div>
              <div className="mb-4 flex items-center justify-between rounded-xl border border-edge bg-ink/40 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{t.plfTitle}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{t.plfDesc}</p>
                </div>
                <span className="rounded-md border border-accent2/20 bg-accent2/10 px-2 py-1 font-mono text-xs font-bold text-accent2">
                  PLF = RPK / ASK × 100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "rpk", label: t.rpkLabel, val: rpk, set: (v: number) => setRpk(v) },
                  { id: "ask", label: t.askLabel,  val: ask, set: (v: number) => setAsk(v) },
                ].map(f => (
                  <div key={f.id}>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</label>
                    <input
                      type="number"
                      value={f.val}
                      onChange={e => f.set(parseFloat(e.target.value) || 0)}
                      className="input font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-edge pt-3">
              <span className="text-xs text-slate-400">{t.efficacy}</span>
              <span className="font-mono text-lg font-black text-accent">{plf}% PLF</span>
            </div>
          </div>
        </div>

      </main>

      <footer className="mx-auto mt-12 max-w-7xl border-t border-edge/60 px-4 py-6 text-center text-xs text-slate-500">
        {t.footer}
      </footer>
    </div>
  );
}

function DonutChart({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  let current = 0;
  const stops = segments.map(s => {
    const start = (current / total) * 100;
    current += s.value;
    const end = (current / total) * 100;
    return `${s.color} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
  });
  const gradient = `conic-gradient(from -90deg, ${stops.join(", ")})`;
  return (
    <div className="relative mx-auto h-36 w-36 shrink-0">
      <div className="h-full w-full rounded-full" style={{ background: gradient }} />
      <div className="absolute inset-0 m-auto flex h-20 w-20 flex-col items-center justify-center rounded-full bg-panel">
        <span className="font-mono text-xl font-black text-white">{total}</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-500">carriers</span>
      </div>
    </div>
  );
}
