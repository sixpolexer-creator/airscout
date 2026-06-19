export type Lang = "en" | "he" | "ru";
export type Dir = "ltr" | "rtl";

export const langMeta: Record<Lang, { dir: Dir; label: string }> = {
  en: { dir: "ltr", label: "EN" },
  he: { dir: "rtl", label: "עב" },
  ru: { dir: "ltr", label: "RU" },
};

export interface Translations {
  // Header
  tagline: string;
  subtitle: string;
  // Currency
  currency: string;
  // Airport input
  airportPlaceholder: string;
  // Journey types
  oneway: string;
  roundtrip: string;
  multiCity: string;
  // Route inputs
  from: string;
  to: string;
  swapTitle: string;
  // Search fields
  passengers: string;
  cabin: string;
  flexLabel: (days: number) => string;
  depart: string;
  returnLabel: string;
  oneWay: string;
  nearbyAirports: string;
  searchCta: string;
  scanning: string;
  // Cabin options
  economy: string;
  premium: string;
  business: string;
  first: string;
  // Stop pickers
  maxStopsOutbound: string;
  maxStopsReturn: string;
  any: string;
  direct: string;
  stopCount: (n: number) => string;
  // Multi-city
  addLeg: string;
  pax: string;
  searchLegs: (n: number) => string;
  legLabel: string;
  date: string;
  remove: string;
  // Filter bar
  filters: string;
  stops: string;
  upTo1Stop: string;
  carrier: string;
  fullService: string;
  lowCost: string;
  airlines: string;
  clearAllFilters: string;
  // Deal feed
  liveAiDealFeed: string;
  scannedShown: (scanned: number, shown: number) => string;
  bestValueFound: string;
  savesVsMedian: (amount: string) => string;
  noMatchingFlights: string;
  loosenFilters: (n: number) => string;
  readyForTakeoff: string;
  runSearchPrompt: string;
  aiScanning: string;
  establishingUplink: string;
  // Leg display
  out: string;
  back: string;
  routeSep: string;
  // Card badges
  bagIncluded: string;
  roundTripBadge: string;
  altAirport: (km: number) => string;
  separateTickets: string;
  // Book button
  seeLivePrice: (name: string) => string;
  opening: (name: string) => string;
  // Price meta
  perHour: string;
  outDuration: string;
  estimated: string;
  // Calendar
  calendarDepart: string;
  calendarReturn: string;
  calendarToday: string;
  calendarClear: string;
  // Trip duration filter
  tripDurationFilter: string;
  tripDurationDays: (n: number) => string;
  tripDurationFlexRange: (min: number, max: number) => string;
  durFlexLabel: string;
  // Store error keys
  errorPickDate: string;
  errorMinLegs: string;
}

export const translations: Record<Lang, Translations> = {
  en: {
    tagline: "AI Flight Engine",
    subtitle:
      "Autonomous AI agents scan global inventories, decode routings, and surface the absolute lowest-priced way to your destination.",
    currency: "Currency",
    airportPlaceholder: "City or IATA code",
    oneway: "One Way",
    roundtrip: "Round Trip",
    multiCity: "Multi-City",
    from: "From",
    to: "To",
    swapTitle: "Swap origin and destination",
    passengers: "Passengers",
    cabin: "Cabin",
    flexLabel: (days) => `Date flexibility: ±${days} day${days === 1 ? "" : "s"}`,
    depart: "Depart",
    returnLabel: "Return",
    oneWay: "one way",
    nearbyAirports: "Also scan alternate airports near the destination",
    searchCta: "Find the cheapest way there →",
    scanning: "Scanning inventories…",
    economy: "Economy",
    premium: "Premium Economy",
    business: "Business",
    first: "First Class",
    maxStopsOutbound: "Max stops — outbound",
    maxStopsReturn: "Max stops — return",
    any: "Any",
    direct: "Direct",
    stopCount: (n) => (n === 0 ? "direct" : `${n} stop${n !== 1 ? "s" : ""}`),
    addLeg: "+ Add leg",
    pax: "Pax",
    searchLegs: (n) => `Search ${n} legs →`,
    legLabel: "Leg",
    date: "Date",
    remove: "Remove",
    filters: "Filters",
    stops: "Stops",
    upTo1Stop: "≤1 stop",
    carrier: "Carrier",
    fullService: "Full-service",
    lowCost: "Low-cost",
    airlines: "Airlines",
    clearAllFilters: "Clear all filters",
    liveAiDealFeed: "Live AI Deal Feed",
    scannedShown: (scanned, shown) => `${scanned} scanned · ${shown} shown`,
    bestValueFound: "Best value found",
    savesVsMedian: (amount) => `saves ${amount} vs. median`,
    noMatchingFlights: "No matching flights",
    loosenFilters: (n) => `Loosen the filters to see ${n} result${n !== 1 ? "s" : ""}.`,
    readyForTakeoff: "Ready for takeoff",
    runSearchPrompt: "Run a search to watch the agents find, inspect, and verify live prices.",
    aiScanning: "AI scanning global inventory…",
    establishingUplink: "Establishing inventory uplink…",
    out: "Out",
    back: "Back",
    routeSep: "›",
    bagIncluded: "bag incl.",
    roundTripBadge: "round trip",
    altAirport: (km) => `alt airport · ${km}km`,
    separateTickets: "separate tickets",
    seeLivePrice: (name) => `See live price on ${name} →`,
    opening: (name) => `Opening ${name}…`,
    perHour: "/hr",
    outDuration: "out",
    estimated: "est.",
    calendarDepart: "Depart",
    calendarReturn: "Return",
    calendarToday: "Today",
    calendarClear: "Clear",
    tripDurationFilter: "Trip Duration",
    tripDurationDays: (n) => `${n} day${n !== 1 ? "s" : ""}`,
    tripDurationFlexRange: (min, max) => `Flexible: ${min}–${max} days`,
    durFlexLabel: "Duration flexibility",
    errorPickDate: "Pick a departure date first.",
    errorMinLegs: "Add at least two complete legs for a multi-city trip.",
  },

  he: {
    tagline: "מנוע טיסות AI",
    subtitle:
      "סוכני AI אוטומתיים שסורקים מלאי עולמי, מפענחים מסלולים ומגלים את הדרך הזולה ביותר ליעד שלך.",
    currency: "מטבע",
    airportPlaceholder: "עיר או קוד IATA",
    oneway: "כיוון אחד",
    roundtrip: "הלוך ושוב",
    multiCity: "מספר יעדים",
    from: "מוצא",
    to: "יעד",
    swapTitle: "החלף מוצא ויעד",
    passengers: "נוסעים",
    cabin: "מחלקה",
    flexLabel: (days) => `גמישות בתאריכים: ±${days} ${days === 1 ? "יום" : "ימים"}`,
    depart: "יציאה",
    returnLabel: "חזרה",
    oneWay: "כיוון אחד",
    nearbyAirports: "סרוק גם שדות תעופה חלופיים ליד היעד",
    searchCta: "← מצא את הדרך הזולה ביותר",
    scanning: "סורק מלאי…",
    economy: "אקונומי",
    premium: "פרמיום אקונומי",
    business: "ביזנס",
    first: "ראשונה",
    maxStopsOutbound: "עצירות מקס׳ — יציאה",
    maxStopsReturn: "עצירות מקס׳ — חזרה",
    any: "הכל",
    direct: "ישיר",
    stopCount: (n) => (n === 0 ? "ישיר" : `${n} עציר${n > 1 ? "ות" : "ה"}`),
    addLeg: "+ הוסף יעד",
    pax: "נוסעים",
    searchLegs: (n) => `← חפש ${n} ${n === 1 ? "יעד" : "יעדים"}`,
    legLabel: "יעד",
    date: "תאריך",
    remove: "הסר",
    filters: "סינון",
    stops: "עצירות",
    upTo1Stop: "עד עצירה",
    carrier: "מפעיל",
    fullService: "שירות מלא",
    lowCost: "חברה זולה",
    airlines: "חברות תעופה",
    clearAllFilters: "נקה את כל הסינונים",
    liveAiDealFeed: "עדכון מבצעים חי",
    scannedShown: (scanned, shown) => `${scanned} נסרקו · ${shown} מוצגים`,
    bestValueFound: "הערך הטוב ביותר",
    savesVsMedian: (amount) => `חיסכון של ${amount} לעומת החציון`,
    noMatchingFlights: "אין טיסות תואמות",
    loosenFilters: (n) => `שחרר את הסינונים כדי לראות ${n} תוצאות.`,
    readyForTakeoff: "מוכן להמראה",
    runSearchPrompt: "הפעל חיפוש וצפה כיצד הסוכנים מוצאים ומאמתים מחירים חיים.",
    aiScanning: "AI סורק מלאי עולמי…",
    establishingUplink: "מקיים קשר עם המלאי…",
    out: "יציאה",
    back: "חזרה",
    routeSep: "‹",
    bagIncluded: "כולל מטען",
    roundTripBadge: "הלוך ושוב",
    altAirport: (km) => `שד״ת חלופי · ${km} ק״מ`,
    separateTickets: "כרטיסים נפרדים",
    seeLivePrice: (name) => `← ראה מחיר חי ב-${name}`,
    opening: (name) => `פותח את ${name}…`,
    perHour: "/שעה",
    outDuration: "יציאה",
    estimated: "משוער",
    calendarDepart: "יציאה",
    calendarReturn: "חזרה",
    calendarToday: "היום",
    calendarClear: "נקה",
    tripDurationFilter: "אורך הטיול",
    tripDurationDays: (n) => `${n} ${n === 1 ? "יום" : "ימים"}`,
    tripDurationFlexRange: (min, max) => `גמיש: ${min}–${max} ימים`,
    durFlexLabel: "גמישות ימים",
    errorPickDate: "יש לבחור תאריך יציאה תחילה.",
    errorMinLegs: "יש להוסיף לפחות שני קטעים מלאים לטיול ריבוי ערים.",
  },

  ru: {
    tagline: "AI-поиск авиабилетов",
    subtitle:
      "Автономные AI-агенты сканируют мировые базы, анализируют маршруты и находят самый выгодный вариант для вашего путешествия.",
    currency: "Валюта",
    airportPlaceholder: "Город или код IATA",
    oneway: "В одну сторону",
    roundtrip: "Туда и обратно",
    multiCity: "Несколько направлений",
    from: "Откуда",
    to: "Куда",
    swapTitle: "Поменять местами",
    passengers: "Пассажиры",
    cabin: "Класс",
    // NOTE: Russian requires grammatical agreement with number (день/дня/дней).
    // The rule: ends in 1 (not 11) → "день"; ends in 2-4 (not 12-14) → "дня"; else → "дней".
    flexLabel: (days) => {
      const mod10 = days % 10;
      const mod100 = days % 100;
      const label =
        mod100 >= 11 && mod100 <= 14 ? "дней"
        : mod10 === 1 ? "день"
        : mod10 >= 2 && mod10 <= 4 ? "дня"
        : "дней";
      return `Гибкость дат: ±${days} ${label}`;
    },
    depart: "Вылет",
    returnLabel: "Обратно",
    oneWay: "в одну сторону",
    nearbyAirports: "Также искать рейсы в соседние аэропорты",
    searchCta: "Найти самый дешёвый вариант →",
    scanning: "Поиск рейсов…",
    economy: "Эконом",
    // NOTE: "Премиум-эконом" maps to Premium Economy — the industry-standard Russian term.
    // If this field covers a broader "premium" tier beyond PE, rename to "Повышенный комфорт".
    premium: "Премиум-эконом",
    business: "Бизнес",
    first: "Первый класс",
    maxStopsOutbound: "Макс. пересадок — туда",
    maxStopsReturn: "Макс. пересадок — обратно",
    any: "Любые",
    direct: "Прямой",
    stopCount: (n) => {
      if (n === 0) return "прямой";
      const mod10 = n % 10;
      const mod100 = n % 100;
      const label =
        mod100 >= 11 && mod100 <= 14 ? "пересадок"
        : mod10 === 1 ? "пересадка"
        : mod10 >= 2 && mod10 <= 4 ? "пересадки"
        : "пересадок";
      return `${n} ${label}`;
    },
    addLeg: "+ Добавить маршрут",
    pax: "Пасс.",
    searchLegs: (n) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      const label =
        mod100 >= 11 && mod100 <= 14 ? "маршрутов"
        : mod10 === 1 ? "маршрут"
        : mod10 >= 2 && mod10 <= 4 ? "маршрута"
        : "маршрутов";
      return `Искать ${n} ${label} →`;
    },
    legLabel: "Маршрут",
    date: "Дата",
    remove: "Удалить",
    filters: "Фильтры",
    stops: "Пересадки",
    upTo1Stop: "≤1 пересадки",
    // NOTE: "Классический" is chosen over "Сетевой перевозчик" (network carrier) for
    // brevity in the UI pill. If full-service branding is preferred, use "Классический".
    carrier: "Перевозчик",
    fullService: "Классический",
    lowCost: "Лоукостер",
    airlines: "Авиакомпании",
    clearAllFilters: "Сбросить фильтры",
    liveAiDealFeed: "Лента AI-предложений",
    scannedShown: (scanned, shown) => `${scanned} просмотрено · ${shown} найдено`,
    bestValueFound: "Лучшее предложение",
    savesVsMedian: (amount) => `экономия ${amount} vs медианы`,
    noMatchingFlights: "Рейсов не найдено",
    loosenFilters: (n) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      const label =
        mod100 >= 11 && mod100 <= 14 ? "результатов"
        : mod10 === 1 ? "результат"
        : mod10 >= 2 && mod10 <= 4 ? "результата"
        : "результатов";
      return `Ослабьте фильтры, чтобы увидеть ${n} ${label}.`;
    },
    readyForTakeoff: "Готово к поиску",
    runSearchPrompt: "Запустите поиск — наблюдайте, как агенты находят и проверяют актуальные цены.",
    aiScanning: "AI сканирует мировые базы…",
    establishingUplink: "Подключение к базам данных…",
    out: "Туда",
    back: "Обратно",
    routeSep: "›",
    bagIncluded: "багаж вкл.",
    roundTripBadge: "туда и обратно",
    altAirport: (km) => `альт. аэропорт · ${km} км`,
    separateTickets: "раздельные билеты",
    seeLivePrice: (name) => `Смотреть цену на ${name} →`,
    opening: (name) => `Открываем ${name}…`,
    perHour: "/ч",
    outDuration: "туда",
    estimated: "прим.",
    calendarDepart: "Вылет",
    calendarReturn: "Обратно",
    calendarToday: "Сегодня",
    calendarClear: "Очистить",
    tripDurationFilter: "Продолжительность поездки",
    tripDurationDays: (n) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      const label =
        mod100 >= 11 && mod100 <= 14 ? "дней"
        : mod10 === 1 ? "день"
        : mod10 >= 2 && mod10 <= 4 ? "дня"
        : "дней";
      return `${n} ${label}`;
    },
    tripDurationFlexRange: (min, max) => `Гибко: ${min}–${max} дн.`,
    durFlexLabel: "Гибкость по длительности",
    errorPickDate: "Сначала выберите дату вылета.",
    errorMinLegs: "Добавьте не менее двух полных маршрутов для поездки с несколькими направлениями.",
  },
};

/** Resolve a stored error key (e.g. "errorPickDate") to a translated string. */
export function resolveError(key: string | null, t: Translations): string | null {
  if (!key) return null;
  const val = (t as unknown as Record<string, unknown>)[key];
  return typeof val === "string" ? val : key;
}
