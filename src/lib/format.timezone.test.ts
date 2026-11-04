import { describe, it, expect } from 'vitest'
import { formatShortDate } from './format'

process.env.TZ = 'America/Los_Angeles'

describe('formatShortDate west of UTC', () => {
  it('runs in a zone eight hours behind UTC', () => {
    expect(new Date('2027-01-01T00:00:00Z').getTimezoneOffset()).toBe(480)
  })

  it('does not shift a first-of-month date into the previous day', () => {
    expect(formatShortDate('2027-01-01')).toBe('1 Jan 2027')
  })
})
