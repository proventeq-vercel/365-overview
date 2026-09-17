import { describe, it, expect } from 'vitest'
import { parseReportSettings } from './reportSettings'

describe('parseReportSettings', () => {
  it('reads a tenant that conceals names', () => {
    expect(parseReportSettings({ displayConcealedNames: true })).toBe(true)
  })

  it('reads a tenant that shows real names', () => {
    expect(parseReportSettings({ displayConcealedNames: false })).toBe(false)
  })

  it('answers unknown, never a verdict, when the setting is missing or not a boolean', () => {
    expect(parseReportSettings({})).toBeNull()
    expect(parseReportSettings({ displayConcealedNames: 'true' })).toBeNull()
  })
})
