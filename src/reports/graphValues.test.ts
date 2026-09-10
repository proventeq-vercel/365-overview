import { describe, expect, it } from 'vitest'
import { bool, dateOrNull, num, text } from './graphValues'

describe('num', () => {
  it('coerces the string numerics the report endpoints return', () => {
    expect(num('1024')).toBe(1024)
    expect(num(1024)).toBe(1024)
  })

  it('treats an absent or blank column as zero', () => {
    expect(num('')).toBe(0)
    expect(num(null)).toBe(0)
    expect(num(undefined)).toBe(0)
  })

  it('does not let an unparseable column become NaN', () => {
    expect(num('n/a')).toBe(0)
  })
})

describe('bool', () => {
  it('reads the "True"/"False" strings the report endpoints return', () => {
    expect(bool('True')).toBe(true)
    expect(bool('true')).toBe(true)
    expect(bool('False')).toBe(false)
  })

  it('passes real booleans through', () => {
    expect(bool(true)).toBe(true)
    expect(bool(false)).toBe(false)
  })

  it('is false for anything else', () => {
    expect(bool(null)).toBe(false)
    expect(bool('')).toBe(false)
    expect(bool(1)).toBe(false)
  })
})

describe('text', () => {
  it('returns strings and blanks everything else', () => {
    expect(text('site')).toBe('site')
    expect(text(null)).toBe('')
    expect(text(7)).toBe('')
  })
})

describe('dateOrNull', () => {
  it('keeps a date and nulls the empty column a never-active site returns', () => {
    expect(dateOrNull('2026-09-01')).toBe('2026-09-01')
    expect(dateOrNull('')).toBeNull()
    expect(dateOrNull('   ')).toBeNull()
    expect(dateOrNull(null)).toBeNull()
  })
})
