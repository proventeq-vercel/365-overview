import { describe, it, expect } from 'vitest'
import type { StorageOverview } from '@/types/storage'
import { translate as t } from '@/test/render'
import { buildCallout, forecastCard } from './forecastCopy'
import { base, dailyRate, firstDay, unknownEntitlement } from './testFixtures'

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

const headline = (overview: StorageOverview) => forecastCard(overview, t).value
const hint = (overview: StorageOverview) => forecastCard(overview, t).hint

describe('forecastCard value', () => {
  it('shows the exhaustion month when there is one', () => {
    expect(headline(base)).toBe('January 2030')
    expect(forecastCard(base, t).label).toBe('Forecast exhaustion')
    expect(forecastCard(base, t).status).toBe('Healthy')
  })

  it('shows the monthly growth, never Unknown, without an entitlement', () => {
    const card = forecastCard(unknownEntitlement, t)
    expect(card.label).toBe('SharePoint growth per month')
    expect(card.value).toBe('+10 GB')
    expect(card.status).toBeNull()
  })

  it('says the entitlement is already exceeded at zero runway', () => {
    expect(headline(overEntitlement)).toBe('Entitlement already exceeded')
  })

  it('forecasts a date from the daily series on a short history', () => {
    expect(headline(dailyRate)).toBe('January 2030')
  })

  it('shows the storage used when only one day has been reported', () => {
    const card = forecastCard(firstDay, t)
    expect(card.label).toBe('SharePoint storage used')
    expect(card.value).toBe('500 GB')
    expect(card.status).toBeNull()
  })

  it('distinguishes beyond-horizon from no growth', () => {
    expect(headline(beyondHorizon)).toBe('Beyond 10 years')
    expect(headline(flat)).toBe('No growth detected')
  })
})

describe('forecastCard hint', () => {
  it('gives the storage used and its growth, and where to enter the entitlement, when it is unknown', () => {
    expect(hint(unknownEntitlement)).toBe(
      '500 GB of SharePoint storage today, growing 10 GB a month over the last 5 months. Enter the tenant entitlement in Report settings to see when it runs out.',
    )
  })

  it('explains a date by the entitlement, the growth assumption and the headroom left', () => {
    expect(hint(base)).toBe(
      'The month SharePoint storage passes your 1000 GB entitlement if it keeps growing 10 GB a month. 500 GB of headroom is left.',
    )
  })

  it('quotes the headroom left, not the storage used', () => {
    const tighter: StorageOverview = {
      ...base,
      sharePoint: { ...base.sharePoint, usedBytes: 620 * 1_073_741_824, remainingBytes: 380 * 1_073_741_824 },
    }
    expect(hint(tighter)).toMatch(/380 GB of headroom is left\.$/)
  })

  it('explains beyond-horizon by how long the headroom lasts', () => {
    expect(hint(beyondHorizon)).toBe(
      'At 10 GB a month, the 500 GB of headroom left under your 1000 GB entitlement lasts more than 10 years.',
    )
  })

  it('explains no forecast for a flat tenant by the window it did not grow over', () => {
    expect(hint(flat)).toBe(
      'SharePoint storage has not grown over the last 5 months, so it is not on course to pass your 1000 GB entitlement.',
    )
  })

  it('counts the days a flat daily series did not grow over', () => {
    const flatDaily: StorageOverview = {
      ...flat,
      growth: { ...flat.growth, rateSource: 'daily', windowDays: 40 },
    }
    expect(hint(flatDaily)).toBe(
      'SharePoint storage has not grown over the last 40 days, so it is not on course to pass your 1000 GB entitlement.',
    )
  })

  it('explains zero runway with the already-exhausted note', () => {
    expect(hint(overEntitlement)).toMatch(/already using more than its pooled entitlement/)
  })

  it('names the days a short-history forecast was measured over', () => {
    expect(hint(dailyRate)).toBe(
      'The month SharePoint storage passes your 1000 GB entitlement if it keeps growing 10 GB a month. 500 GB of headroom is left. Forecast from the last 40 days of storage: Microsoft 365 has reported under six months so far, so treat it as indicative.',
    )
  })

  it('says the forecast starts from the second reported day', () => {
    expect(hint(firstDay)).toBe(
      'Microsoft 365 has reported one day of SharePoint storage so far. The forecast starts from the second day it reports.',
    )
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

  it('projects used storage under a Projection pill without an entitlement', () => {
    const callout = buildCallout(unknownEntitlement, t)
    expect(callout.pillLabel).toBe('Projection')
    expect(callout.pillStatus).toBeNull()
    expect(callout.headline).toBe('SharePoint storage reaches 560 GB in 6 months')
    expect(callout.note).toBe(
      'At +10 GB a month, the rate over the last 5 months. Enter the tenant entitlement in Options, Report settings to see when it runs out.',
    )
    expect(callout.tone).toBe('info')
  })

  it('states the entitlement is already exceeded at zero runway', () => {
    const callout = buildCallout(overEntitlement, t)
    expect(callout.headline).toBe('Entitlement already exceeded')
    expect(callout.tone).toBe('warn')
    expect(callout.pillLabel).toBe('Critical')
  })

  it('forecasts from the daily series on a short history, and says over how many days', () => {
    const callout = buildCallout(dailyRate, t)
    expect(callout.headline).toBe('Capacity exhausts around January 2030')
    expect(callout.pillLabel).toBe('Healthy')
    expect(callout.note).toMatch(/Forecast from the last 40 days of storage: Microsoft 365 has reported under six months so far/)
    expect(buildCallout(base, t).note).not.toMatch(/Forecast from the last/)
  })

  it('shows the storage used today when only one day has been reported', () => {
    const callout = buildCallout(firstDay, t)
    expect(callout.headline).toBe('500 GB of SharePoint storage in use today')
    expect(callout.pillLabel).toBe('Today')
    expect(callout.note).toMatch(/^Microsoft 365 has reported one day of SharePoint storage so far\./)
  })

  it('states no exhaustion within the horizon for a flat tenant', () => {
    const callout = buildCallout(flat, t)
    expect(callout.headline).toBe('No exhaustion forecast within 10 years')
    expect(callout.note).toMatch(/for at least the next 10 years/)
  })
})

