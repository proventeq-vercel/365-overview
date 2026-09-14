export const CURRENCY_CODES = [
  'GBP',
  'EUR',
  'USD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'AUD',
  'NZD',
  'CAD',
  'INR',
  'ZAR',
  'JPY',
  'AED',
  'SGD',
  'HKD',
] as const

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' })

export function currencySymbol(code: string): string {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? code
  )
}

export function currencyName(code: string): string {
  return currencyNames.of(code) ?? code
}

export function currencyOptions(current: string): readonly string[] {
  return CURRENCY_CODES.includes(current as (typeof CURRENCY_CODES)[number])
    ? CURRENCY_CODES
    : [current, ...CURRENCY_CODES]
}
