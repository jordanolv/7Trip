import { z } from 'zod';

/**
 * Currencies an expense can be entered in (docs/decisions.md, "Devise de référence", "Source des
 * taux"). `ecb`: the European Central Bank publishes a daily rate for it, so the apps fill the rate
 * in; for the others it is typed by hand. `whole`: usually written without cents (¥1 500).
 * Amounts are always kept in hundredths, whatever the currency.
 */
export const CURRENCIES = {
  EUR: { label: 'Euro', symbol: '€', ecb: true },
  USD: { label: 'Dollar américain', symbol: '$', ecb: true },
  GBP: { label: 'Livre sterling', symbol: '£', ecb: true },
  CHF: { label: 'Franc suisse', symbol: 'CHF', ecb: true },
  CAD: { label: 'Dollar canadien', symbol: 'CAD', ecb: true },
  JPY: { label: 'Yen', symbol: '¥', ecb: true, whole: true },
  AUD: { label: 'Dollar australien', symbol: 'AUD', ecb: true },
  NZD: { label: 'Dollar néo-zélandais', symbol: 'NZD', ecb: true },
  CNY: { label: 'Yuan', symbol: 'CNY', ecb: true },
  HKD: { label: 'Dollar de Hong Kong', symbol: 'HKD', ecb: true },
  SGD: { label: 'Dollar de Singapour', symbol: 'SGD', ecb: true },
  THB: { label: 'Baht', symbol: 'THB', ecb: true },
  IDR: { label: 'Roupie indonésienne', symbol: 'IDR', ecb: true, whole: true },
  MYR: { label: 'Ringgit', symbol: 'MYR', ecb: true },
  PHP: { label: 'Peso philippin', symbol: 'PHP', ecb: true },
  INR: { label: 'Roupie indienne', symbol: 'INR', ecb: true },
  KRW: { label: 'Won', symbol: 'KRW', ecb: true, whole: true },
  ILS: { label: 'Shekel', symbol: 'ILS', ecb: true },
  TRY: { label: 'Livre turque', symbol: 'TRY', ecb: true },
  ZAR: { label: 'Rand', symbol: 'ZAR', ecb: true },
  MXN: { label: 'Peso mexicain', symbol: 'MXN', ecb: true },
  BRL: { label: 'Réal', symbol: 'BRL', ecb: true },
  SEK: { label: 'Couronne suédoise', symbol: 'SEK', ecb: true },
  NOK: { label: 'Couronne norvégienne', symbol: 'NOK', ecb: true },
  DKK: { label: 'Couronne danoise', symbol: 'DKK', ecb: true },
  ISK: { label: 'Couronne islandaise', symbol: 'ISK', ecb: true, whole: true },
  PLN: { label: 'Złoty', symbol: 'PLN', ecb: true },
  CZK: { label: 'Couronne tchèque', symbol: 'CZK', ecb: true },
  HUF: { label: 'Forint', symbol: 'HUF', ecb: true, whole: true },
  RON: { label: 'Leu roumain', symbol: 'RON', ecb: true },
  MAD: { label: 'Dirham marocain', symbol: 'MAD', ecb: false },
  TND: { label: 'Dinar tunisien', symbol: 'TND', ecb: false },
  EGP: { label: 'Livre égyptienne', symbol: 'EGP', ecb: false },
  AED: { label: 'Dirham des Émirats', symbol: 'AED', ecb: false },
  VND: { label: 'Dong', symbol: 'VND', ecb: false, whole: true },
  TWD: { label: 'Dollar de Taïwan', symbol: 'TWD', ecb: false },
  LKR: { label: 'Roupie srilankaise', symbol: 'LKR', ecb: false },
  ARS: { label: 'Peso argentin', symbol: 'ARS', ecb: false },
  CLP: { label: 'Peso chilien', symbol: 'CLP', ecb: false, whole: true },
  COP: { label: 'Peso colombien', symbol: 'COP', ecb: false, whole: true },
  PEN: { label: 'Sol', symbol: 'PEN', ecb: false },
  CRC: { label: 'Colón', symbol: 'CRC', ecb: false },
} satisfies Record<string, { label: string; symbol: string; ecb: boolean; whole?: boolean }>;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]];
export const currencySchema = z.enum(CURRENCY_CODES, 'Devise inconnue');

const info = (code: string): { label: string; symbol: string; ecb: boolean; whole?: boolean } | undefined =>
  (CURRENCIES as Record<string, { label: string; symbol: string; ecb: boolean; whole?: boolean }>)[code];

export const currencySymbol = (code: string) => info(code)?.symbol ?? code;
export const currencyLabel = (code: string) => info(code)?.label ?? code;
/** The ECB publishes a rate for it: the apps can fill it in. */
export const hasEcbRate = (code: string) => info(code)?.ecb ?? false;
/** Written without cents when there are none (¥1 500, not ¥1 500,00). */
export const isWholeCurrency = (code: string) => info(code)?.whole ?? false;

/**
 * How much one unit of the expense's currency is worth in the trip's currency ("1 USD = 0,8985 €").
 * Frozen on the expense when it is entered (docs/decisions.md).
 */
export const rateSchema = z
  .number('Indique le taux')
  .positive('Le taux doit être positif')
  .max(1_000_000, 'Taux trop élevé')
  .transform((rate) => Number(rate.toPrecision(10)));

/** An amount in the expense's currency, in the trip's currency (hundredths, rounded). */
export const toBaseMinor = (minor: number, rate: number) => Math.round(minor * rate);

/**
 * Shares in the expense's currency, in the trip's currency, adding up to exactly `baseTotal`:
 * each is rounded down, then the leftover hundredths go to the largest remainders (ties: in order).
 */
export function convertShares<T extends { amountMinor: number }>(shares: T[], rate: number, baseTotal: number): (T & { baseMinor: number })[] {
  const exact = shares.map((share) => share.amountMinor * rate);
  const sum = exact.reduce((total, value) => total + value, 0);
  // Scaled so that the floors can always reach baseTotal, even after the total was rounded up.
  const scaled = sum > 0 ? exact.map((value) => (value * baseTotal) / sum) : exact.map(() => 0);
  const floors = scaled.map((value) => Math.floor(value + 1e-9));
  let left = baseTotal - floors.reduce((total, value) => total + value, 0);
  const order = scaled.map((value, index) => ({ index, remainder: value - floors[index]! })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    floors[index]! += 1;
    left -= 1;
  }
  return shares.map((share, index) => ({ ...share, baseMinor: floors[index]! }));
}

/** A rate as typed: "0,8985", "0.8985", "158". Null when it is not one. */
export function parseRate(text: string): number | null {
  const clean = text.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const rate = Number(clean);
  return rate > 0 ? rate : null;
}

/** Text for a rate field, in French: 0.89847 → "0,89847". */
export const rateInputText = (rate: number) => String(Number(rate.toPrecision(10))).replace('.', ',');
