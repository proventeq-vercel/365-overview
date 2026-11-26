import { describe, it, expect } from 'vitest'
import type { StorageOverview } from '@/types/storage'
import { translate as t } from '@/test/render'
import { LABEL_TONES } from '@/design/theme'
import { buildCallout, estimatedQuotaNote, forecastCard, siteReportSource } from './forecastCopy'
import { base, dailyRate, firstDay, unknownEntitlement } from './testFixtures'

const withGrowth = (over: Partial<StorageOverview['growth']>): StorageOverview => ({
  ...base,
  growth: { ...base.growth, ...over },
})

const overEntitlement: StorageOverview = {
  ...withGrowth({ forecastStatus: 'Critical', forecastExhaustionDate: null, forecastMonthsToExhaustion: 0 }),
  sharePoint: { ...base.sharePoint, exhausted: true, remainingBytes: 0, overageBytes: 100 * 1_073_741_824 },
}

const flat: StorageOverview = withGrowth({
  forecastStatus: 'Healthy',
  forecastExhaustionDate: null,
  forecastMonthsToExhaustion: null,
  avgMonthlyGrowthBytes: 0,
})

const hint = (overview: StorageOverview) => forecastCard('2030-01-01', overview, t).hint

describe('forecastCard', () => {
  it('shows the exhaustion month at current growth, graded by the forecast', () => {
    expect(forecastCard('2030-01-01', base, t)).toEqual({
      value: 'January 2030',
      status: 'Healthy',
      hint: 'At current growth',
    })
  })

  it('names the days a short-history forecast was measured over', () => {
    expect(hint(dailyRate)).toBe(
      'At current growth · Forecast from the last 40 days of storage: there are fewer than six monthly figures, so treat it as indicative.',
    )
  })
})

describe('siteReportSource', () => {
  it('names nothing while the storage comes from the trend', () => {
    expect(siteReportSource(base, t)).toBeNull()
  })

  it('says the storage is the site usage report total when the trend lists no day', () => {
    const noTrend: StorageOverview = { ...firstDay, sharePoint: { ...firstDay.sharePoint, usedFromSiteReport: true } }
    expect(siteReportSource(noTrend, t)).toBe(
      "This is the total of its site usage report: Microsoft 365's storage trend lists no day with storage yet.",
    )
  })

  it('says the trend did not come back, not that it lists no day, when it failed', () => {
    const trendUnread: StorageOverview = {
      ...firstDay,
      sharePoint: { ...firstDay.sharePoint, usedFromSiteReport: true, trendRead: false },
    }
    expect(siteReportSource(trendUnread, t)).toBe(
      "This is the total of its site usage report: Microsoft 365's SharePoint storage trend did not come back this time.",
    )
  })
})

describe('buildCallout', () => {
  it('says the figure is the site report total when the storage trend has no day at all', () => {
    const noTrend: StorageOverview = { ...firstDay, sharePoint: { ...firstDay.sharePoint, usedFromSiteReport: true } }
    expect(buildCallout(noTrend, t).note).toMatch(/^Microsoft 365's storage trend lists no day with storage for this tenant yet, so this is the total of its site usage report\./)
  })

  it('says the storage trend did not come back, not that it lists no day, when it failed', () => {
    const trendUnread: StorageOverview = {
      ...firstDay,
      sharePoint: { ...firstDay.sharePoint, usedFromSiteReport: true, trendRead: false },
    }
    expect(buildCallout(trendUnread, t).note).toMatch(
      /^Microsoft 365's SharePoint storage trend did not come back this time, so this is the total of the site usage report\. The forecast returns when Refresh data brings the trend back\./,
    )
    const exhausted: StorageOverview = {
      ...trendUnread,
      sharePoint: { ...trendUnread.sharePoint, exhausted: true, remainingBytes: 0, overageBytes: 1_073_741_824 },
      growth: { ...firstDay.growth, forecastStatus: 'Critical', forecastMonthsToExhaustion: 0 },
    }
    expect(buildCallout(exhausted, t).note).toMatch(
      /This is the total of its site usage report: Microsoft 365's SharePoint storage trend did not come back this time\. /,
    )
  })

  it('reports capacity exhaustion with a warn tone when action is needed', () => {
    const callout = buildCallout(withGrowth({ forecastStatus: 'Warning' }), t)
    expect(callout.tone).toBe('warn')
    expect(callout.pillLabel).toBe('At risk')
    expect(callout.pill).toBe(LABEL_TONES.orange)
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
    expect(callout.pill).toBe(LABEL_TONES.grey)
    expect(callout.headline).toBe('SharePoint storage reaches 560 GB in 6 months')
    expect(callout.note).toBe(
      'At +10 GB a month, the rate over the last 5 months. Enter the tenant entitlement in Options, Report settings to forecast it against the entitlement.',
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
    expect(callout.note).toMatch(/Forecast from the last 40 days of storage: there are fewer than six monthly figures/)
    expect(buildCallout(base, t).note).not.toMatch(/Forecast from the last/)
  })

  it('names the window once, in the projection note, on a short history without an entitlement', () => {
    const note = buildCallout({ ...unknownEntitlement, growth: { ...dailyRate.growth, forecastStatus: 'Unknown' } }, t).note
    expect(note).toBe(
      'At +10 GB a month, the rate over the last 40 days. Enter the tenant entitlement in Options, Report settings to forecast it against the entitlement.',
    )
  })

  it('says the entitlement is exceeded, in red, even when a single day has been reported', () => {
    const exhaustedFirstDay: StorageOverview = {
      ...firstDay,
      sharePoint: { ...firstDay.sharePoint, exhausted: true, remainingBytes: 0, overageBytes: 100 * 1_073_741_824 },
      growth: { ...firstDay.growth, forecastStatus: 'Critical', forecastMonthsToExhaustion: 0 },
    }
    const callout = buildCallout(exhaustedFirstDay, t)
    expect(callout.headline).toBe('Entitlement already exceeded')
    expect(callout.pillLabel).toBe('Critical')
    expect(callout.pill).toBe(LABEL_TONES.red)
  })

  it('says an exceeded entitlement is measured from the site report total when the trend lists no day', () => {
    const exhaustedNoTrend: StorageOverview = {
      ...firstDay,
      sharePoint: {
        ...firstDay.sharePoint,
        usedFromSiteReport: true,
        exhausted: true,
        remainingBytes: 0,
        overageBytes: 100 * 1_073_741_824,
      },
      growth: { ...firstDay.growth, forecastStatus: 'Critical', forecastMonthsToExhaustion: 0 },
    }
    const callout = buildCallout(exhaustedNoTrend, t)
    expect(callout.headline).toBe('Entitlement already exceeded')
    expect(callout.note).toMatch(/This is the total of its site usage report: Microsoft 365's storage trend lists no day with storage yet\./)
    expect(callout.note).not.toMatch(/The forecast starts/)
  })

  it('calls only the headroom approximate when no cost is priced', () => {
    expect(buildCallout(firstDay, t).note).toMatch(/so the headroom is approximate\.$/)
    expect(buildCallout(base, t).note).toMatch(/so the headroom and cost figures are approximate\./)
  })

  it('keeps the cost wording when a saving is still priced against the estimate on a single day', () => {
    const pricedSaving: StorageOverview = { ...firstDay, archive: { ...firstDay.archive, savingApplies: true } }
    expect(estimatedQuotaNote(pricedSaving, t)).toMatch(/so the headroom and cost figures are approximate\./)
    expect(estimatedQuotaNote(firstDay, t)).toMatch(/so the headroom is approximate\.$/)
    expect(estimatedQuotaNote(unknownEntitlement, t)).toBeNull()
  })

  it('keeps the daily note off a callout that forecasts nothing', () => {
    const exhaustedDaily: StorageOverview = {
      ...dailyRate,
      sharePoint: { ...dailyRate.sharePoint, exhausted: true, remainingBytes: 0, overageBytes: 100 * 1_073_741_824 },
      growth: { ...dailyRate.growth, forecastStatus: 'Critical', forecastExhaustionDate: null, forecastMonthsToExhaustion: 0 },
    }
    expect(buildCallout(exhaustedDaily, t).note).not.toMatch(/Forecast from the last/)
  })

  it('shows the storage used when only one day has been reported', () => {
    const callout = buildCallout(firstDay, t)
    expect(callout.headline).toBe('500 GB of SharePoint storage in use')
    expect(callout.pillLabel).toBe('Latest')
    expect(callout.pill).toBe(LABEL_TONES.grey)
    expect(callout.note).toMatch(/^Microsoft 365 has reported one day of SharePoint storage so far\./)
  })

  it('states no exhaustion within the horizon for a flat tenant', () => {
    const callout = buildCallout(flat, t)
    expect(callout.headline).toBe('No exhaustion forecast within 10 years')
    expect(callout.note).toMatch(/for at least the next 10 years/)
  })
})

