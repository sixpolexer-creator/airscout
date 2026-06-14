// Lightweight multi-currency engine. Prices are stored in USD (basePriceUSD)
// and converted at display time using standard baseline factors.

export type CurrencyCode = "USD" | "EUR" | "ILS";

interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  perUSD: number; // how many units of this currency equal 1 USD
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: "USD", symbol: "$", perUSD: 1 },
  EUR: { code: "EUR", symbol: "€", perUSD: 0.92 },
  ILS: { code: "ILS", symbol: "₪", perUSD: 3.7 },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export function convertFromUSD(amountUSD: number, to: CurrencyCode): number {
  return amountUSD * CURRENCIES[to].perUSD;
}

// Formats a USD base amount into the target currency for display.
export function formatMoney(amountUSD: number, to: CurrencyCode): string {
  const value = convertFromUSD(amountUSD, to);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: to,
    maximumFractionDigits: 0,
  }).format(value);
}
