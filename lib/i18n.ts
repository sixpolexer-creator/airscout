export type Lang = "en" | "he";
export type Dir = "ltr" | "rtl";

export const langMeta: Record<Lang, { dir: Dir; label: string }> = {
  en: { dir: "ltr", label: "EN" },
  he: { dir: "rtl", label: "עב" },
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
    oneway: "Oneway",
    roundtrip: "Roundtrip",
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
    premium: "Premium",
    business: "Business",
    first: "First",
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
    savesVsMedian: (amount) => `saves ${amount} vs median`,
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
    tripDurationFilter: "Filter by Trip Duration",
    tripDurationDays: (n) => `${n} day${n !== 1 ? "s" : ""}`,
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
    flexLabel: (days) => `גמישות בתאריך: ±${days} יום`,
    depart: "יציאה",
    returnLabel: "חזרה",
    oneWay: "כיוון אחד",
    nearbyAirports: "סרוק גם שדות תעופה חלופיים ליד היעד",
    searchCta: "← מצא את הדרך הזולה ביותר",
    scanning: "סורק מלאי…",
    economy: "תיירות",
    premium: "פרמיום",
    business: "עסקים",
    first: "ראשונה",
    maxStopsOutbound: "עצירות מקס׳ — יציאה",
    maxStopsReturn: "עצירות מקס׳ — חזרה",
    any: "הכל",
    direct: "ישיר",
    stopCount: (n) => (n === 0 ? "ישיר" : `${n} עציר${n > 1 ? "ות" : "ה"}`),
    addLeg: "+ הוסף יעד",
    pax: "נוסעים",
    searchLegs: (n) => `← חפש ${n} יעדים`,
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
    tripDurationFilter: "סנן לפי אורך הטיול",
    tripDurationDays: (n) => `${n} ימים`,
    errorPickDate: "יש לבחור תאריך יציאה תחילה.",
    errorMinLegs: "יש להוסיף לפחות שתי רגליים מלאות לטיול ריבוי ערים.",
  },
};

/** Resolve a stored error key (e.g. "errorPickDate") to a translated string. */
export function resolveError(key: string | null, t: Translations): string | null {
  if (!key) return null;
  const val = (t as unknown as Record<string, unknown>)[key];
  return typeof val === "string" ? val : key;
}
