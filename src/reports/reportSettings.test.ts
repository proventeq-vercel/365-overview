import { describe, it, expect } from 'vitest'
import { parseReportSettings } from './reportSettings'

describe('parseReportSettings', () => {
  it('reads a tenant that conceals names', () => {
    expect(parseReportSettings({ displayConcealedNames: true })).toBe(true)
  })

  it('reads a tenant that shows real names', () => {
    expect(parseReportSettings({ displayConcealedNames: false })).toBe(false)
  })

  it('treats anything but an explicit true as not concealed', () => {
    expect(parseReportSettings({ displayConcealedNames: 'true' as unknown as boolean })).toBe(false)
  })
})
