import { describe, expect, it } from 'vitest'
import { CURRENCY_CODES, currencyName, currencyOptions, currencySymbol } from './currencies'

describe('currencies', () => {
  it('lists GBP first, as the default currency', () => {
    expect(CURRENCY_CODES[0]).toBe('GBP')
  })

  it('gives the narrow symbol for a currency, not the ambiguous prefixed one', () => {
    expect(currencySymbol('GBP')).toBe('£')
    expect(currencySymbol('USD')).toBe('$')
    expect(currencySymbol('EUR')).toBe('€')
  })

  it('falls back to the code when a currency has no symbol', () => {
    expect(currencySymbol('CHF')).toBe('CHF')
  })

  it('names a currency in English', () => {
    expect(currencyName('CZK')).toBe('Czech Koruna')
  })

  it('offers the standard list when the current code is in it', () => {
    expect(currencyOptions('EUR')).toBe(CURRENCY_CODES)
  })

  it('prepends a stored code that is not in the list so it stays selectable', () => {
    expect(currencyOptions('BRL')).toEqual(['BRL', ...CURRENCY_CODES])
  })
})
