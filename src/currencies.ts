/**
 * ISO 4217 currency definitions.
 * Each entry contains the decimal precision used for minor-unit storage.
 */
export const CURRENCIES = {
  AED: { code: 'AED', decimals: 2, name: 'UAE Dirham' },
  AUD: { code: 'AUD', decimals: 2, name: 'Australian Dollar' },
  BRL: { code: 'BRL', decimals: 2, name: 'Brazilian Real' },
  CAD: { code: 'CAD', decimals: 2, name: 'Canadian Dollar' },
  CHF: { code: 'CHF', decimals: 2, name: 'Swiss Franc' },
  CNY: { code: 'CNY', decimals: 2, name: 'Chinese Yuan' },
  CZK: { code: 'CZK', decimals: 2, name: 'Czech Koruna' },
  DKK: { code: 'DKK', decimals: 2, name: 'Danish Krone' },
  EUR: { code: 'EUR', decimals: 2, name: 'Euro' },
  GBP: { code: 'GBP', decimals: 2, name: 'British Pound' },
  HKD: { code: 'HKD', decimals: 2, name: 'Hong Kong Dollar' },
  HUF: { code: 'HUF', decimals: 2, name: 'Hungarian Forint' },
  IDR: { code: 'IDR', decimals: 2, name: 'Indonesian Rupiah' },
  ILS: { code: 'ILS', decimals: 2, name: 'Israeli New Shekel' },
  INR: { code: 'INR', decimals: 2, name: 'Indian Rupee' },
  JPY: { code: 'JPY', decimals: 0, name: 'Japanese Yen' },
  KRW: { code: 'KRW', decimals: 0, name: 'South Korean Won' },
  KWD: { code: 'KWD', decimals: 3, name: 'Kuwaiti Dinar' },
  MXN: { code: 'MXN', decimals: 2, name: 'Mexican Peso' },
  MYR: { code: 'MYR', decimals: 2, name: 'Malaysian Ringgit' },
  NOK: { code: 'NOK', decimals: 2, name: 'Norwegian Krone' },
  NZD: { code: 'NZD', decimals: 2, name: 'New Zealand Dollar' },
  PHP: { code: 'PHP', decimals: 2, name: 'Philippine Peso' },
  PLN: { code: 'PLN', decimals: 2, name: 'Polish Zloty' },
  RON: { code: 'RON', decimals: 2, name: 'Romanian Leu' },
  SAR: { code: 'SAR', decimals: 2, name: 'Saudi Riyal' },
  SEK: { code: 'SEK', decimals: 2, name: 'Swedish Krona' },
  SGD: { code: 'SGD', decimals: 2, name: 'Singapore Dollar' },
  THB: { code: 'THB', decimals: 2, name: 'Thai Baht' },
  TRY: { code: 'TRY', decimals: 2, name: 'Turkish Lira' },
  TWD: { code: 'TWD', decimals: 2, name: 'New Taiwan Dollar' },
  USD: { code: 'USD', decimals: 2, name: 'US Dollar' },
  VND: { code: 'VND', decimals: 0, name: 'Vietnamese Dong' },
  ZAR: { code: 'ZAR', decimals: 2, name: 'South African Rand' },
} as const

export type CurrencyCode = keyof typeof CURRENCIES
export type CurrencyDef = (typeof CURRENCIES)[CurrencyCode]
