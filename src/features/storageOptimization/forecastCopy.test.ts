import { describe, it, expect } from 'vitest'
import type { StorageOverview } from '@/types/storage'
import { translate as t } from '@/test/render'
import { buildCallout, forecastHeadline, forecastHint } from './forecastCopy'
import { base, shortHistory, unknownEntitlement } from './testFixtures'

const withGrowth = (over: Partial<StorageOverview['growth']>): StorageOverview => ({
  ...base,
  growth: { ...base.growth, ...over },
})

const overEntitlement: StorageOverview = withGrowth({
  forecastStatus: 'Critical',
  forecastExhaustionDate: null,
  forecastMonthsToExhaustion: 0,
})

const flat: StorageOverview = withGrowth({
  forecastStatus: 'Healthy',
  forecastExhaustionDate: null,
  forecastMonthsToExhaustion: null,
  avgMonthlyGrowthBytes: 0,
})

const beyondHorizon: StorageOverview = withGrowth({
  forecastStatus: 'Healthy',
  forecastExhaustionDate: null,
  forecastMonthsToExhaustion: 150,
})

describe('forecastHeadline', () => {
  it('shows the exhaustion month when there is one', () => {
    expect(forecastHeadline(base, t)).toBe('January 2030')
  })

  it('says Unknown, never a date, without an entitlement', () => {
    expect(forecastHeadline(unknownEntitlement, t)).toBe('Unknown')
  })

  it('says the entitlement is already exceeded at zero runway', () => {
    expect(forecastHeadline(overEntitlement, t)).toBe('Entitlement already exceeded')
  })

  it('says there is not enough history on a short window', () => {
    expect(forecastHeadline(shortHistory, t)).toBe('Not enough history')
  })

  it('distinguishes beyond-horizon from no growth', () => {
    expect(forecastHeadline(beyondHorizon, t)).toBe('Beyond 10 years')
    expect(forecastHeadline(flat, t)).toBe('No growth detected')
  })
})

describe('forecastHint', () => {
  it('asks for the entitlement when it is unknown', () => {
    expect(forecastHint(unknownEntitlement, t)).toBe('Needs tenant entitlement')
  })

  it('qualifies a date with the growth assumption', () => {
    expect(forecastHint(base, t)).toBe('At current growth')
  })

  it('explains zero runway with the already-exhausted note', () => {
    expect(forecastHint(overEntitlement, t)).toMatch(/already using more than its pooled entitlement/)
  })

  it('explains a short window', () => {
    expect(forecastHint(shortHistory, t)).toBe('Too few months of measured growth')
  })
})

describe('buildCallout', () => {
  it('reports capacity exhaustion with a warn tone when action is needed', () => {
    const callout = buildCallout(withGrowth({ forecastStatus: 'Warning' }), t)
    expect(callout.tone).toBe('warn')
    expect(callout.pillLabel).toBe('At risk')
    expect(callout.pillStatus).toBe('watch')
    expect(callout.headline).toBe('Capacity exhausts around January 2030')
    expect(callout.note).toMatch(/^At the current growth rate the tenant is projected to pass its pooled entitlement on this trajectory\. Procurement/)
  })

  it('keeps an info tone and the no-action note for a healthy exhaustion far out', () => {
    const callout = buildCallout(base, t)
    expect(callout.tone).toBe('info')
    expect(callout.pillLabel).toBe('Healthy')
    expect(callout.note).toMatch(/but not for years — capacity needs no action today/)
  })

  it('reads the estimated-quota note into the callout once the quota is known but estimated', () => {
    expect(buildCallout(base, t).note).toMatch(/estimated from licence counts/)
    expect(buildCallout(unknownEntitlement, t).note).not.toMatch(/estimated from licence counts/)
  })

  it('appends the volatile note when the series is volatile', () => {
    expect(buildCallout(withGrowth({ seriesIsVolatile: true }), t).note).toMatch(/one month dominates/)
    expect(buildCallout(base, t).note).not.toMatch(/one month dominates/)
  })

  it('uses a grey Unknown pill and the unavailable headline without an entitlement', () => {
    const callout = buildCallout(unknownEntitlement, t)
    expect(callout.pillLabel).toBe('Unknown')
    expect(callout.pillStatus).toBeNull()
    expect(callout.headline).toBe('Capacity forecast unavailable without tenant entitlement')
    expect(callout.tone).toBe('info')
  })

  it('states the entitlement is already exceeded at zero runway', () => {
    const callout = buildCallout(overEntitlement, t)
    expect(callout.headline).toBe('Entitlement already exceeded')
    expect(callout.tone).toBe('warn')
    expect(callout.pillLabel).toBe('Critical')
  })

  it('states there is not enough history, and that this is not an all-clear', () => {
    const callout = buildCallout(shortHistory, t)
    expect(callout.headline).toBe('Not enough history to forecast capacity')
    expect(callout.note).toMatch(/This is not an all-clear/)
    expect(callout.pillLabel).toBe('Unknown')
  })

  it('states no exhaustion within the horizon for a flat tenant', () => {
    const callout = buildCallout(flat, t)
    expect(callout.headline).toBe('No exhaustion forecast within 10 years')
    expect(callout.note).toMatch(/for at least the next 10 years/)
  })
})

