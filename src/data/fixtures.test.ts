import { describe, it, expect } from 'vitest'
import { createMockDataSource } from './fixtures'
import { buildStorageOverview } from '../model/storageOverview'
import { DEFAULT_SETTINGS } from '../lib/settings'

async function overviewFor(scenario: Parameters<typeof createMockDataSource>[0]) {
  const ds = createMockDataSource(scenario)
  const settings = DEFAULT_SETTINGS
  const [sites, drives, sharePointTrend, oneDriveTrend, skus, reportRefreshDate] =
    await Promise.all([
      ds.getSites(),
      ds.getDrives(),
      ds.getSharePointTrend(),
      ds.getOneDriveTrend(),
      ds.getLicenses(),
      ds.getReportRefreshDate(),
    ])
  return buildStorageOverview({
    sites,
    drives,
    sharePointTrend,
    oneDriveTrend,
    skus,
    reportRefreshDate,
    ratePerGb: settings.ratePerGb,
    currency: settings.currency,
    entitlementOverrideBytes: settings.entitlementOverrideBytes,
  })
}

describe('mock data source', () => {
  it('generates a large estate so virtualization is exercised', async () => {
    const sites = await createMockDataSource().getSites()
    expect(sites.length).toBeGreaterThan(2500)
    expect(sites.every((s) => s.pool === 'SharePoint')).toBe(true)
  })

  it('generates drives that carry their own cap, never a template', async () => {
    const drives = await createMockDataSource().getDrives()
    expect(drives.length).toBeGreaterThan(0)
    expect(drives.every((d) => d.pool === 'OneDrive')).toBe(true)
    expect(drives.every((d) => d.allocatedBytes !== undefined)).toBe(true)
    expect(drives.every((d) => d.template === undefined)).toBe(true)
  })

  it.each(['healthy', 'over-entitlement', 'concealed', 'short-history'] as const)(
    '%s: each pool trend ends at the sum of its own rows',
    async (scenario) => {
      const ds = createMockDataSource(scenario)
      const [sites, drives, sharePointTrend, oneDriveTrend] = await Promise.all([
        ds.getSites(),
        ds.getDrives(),
        ds.getSharePointTrend(),
        ds.getOneDriveTrend(),
      ])
      const sum = (rows: { storageUsedBytes: number }[]) =>
        rows.reduce((total, row) => total + row.storageUsedBytes, 0)
      expect(sharePointTrend.at(-1)?.value).toBe(sum(sites))
      expect(oneDriveTrend.at(-1)?.value).toBe(sum(drives))
      expect(sharePointTrend.at(0)?.value).toBeLessThan(sum(sites))
    },
  )

  it('is deterministic, so e2e assertions stay stable', async () => {
    const first = await createMockDataSource().getSites()
    const second = await createMockDataSource().getSites()
    expect(first).toEqual(second)
  })
})

describe('mock scenarios reach every caveat state', () => {
  it('healthy: entitlement estimated, forecast graded, no other caveat', async () => {
    const overview = await overviewFor('healthy')
    expect(overview.caveats).toEqual({
      entitlementIsEstimated: true,
      namesAreConcealed: false,
      historyTooShort: false,
    })
    expect(overview.growth.forecastStatus).toBe('Critical')
    expect(overview.growth.forecastMonthsToExhaustion).toBe(11)
    expect(overview.sharePoint.remainingBytes).toBeGreaterThan(0)
  })

  it('over-entitlement: no headroom, zero runway, Critical', async () => {
    const overview = await overviewFor('over-entitlement')
    expect(overview.sharePoint.remainingBytes).toBe(0)
    expect(overview.sharePoint.overageBytes).toBeGreaterThan(0)
    expect(overview.growth.forecastMonthsToExhaustion).toBe(0)
    expect(overview.growth.forecastExhaustionDate).toBeNull()
    expect(overview.growth.forecastStatus).toBe('Critical')
  })

  it('concealed: names hashed, totals still measured', async () => {
    const overview = await overviewFor('concealed')
    expect(overview.caveats.namesAreConcealed).toBe(true)
    expect(overview.sharePoint.usedBytes).toBeGreaterThan(0)
    expect(overview.oneDrive.usedBytes).toBeGreaterThan(0)
  })

  it('concealed: every hashed row keeps a unique id and a 32-hex owner hash', async () => {
    const overview = await overviewFor('concealed')
    const rows = [...overview.sharePoint.sites, ...overview.oneDrive.drives]
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
    expect(rows[0].ownerDisplayName).toMatch(/^[0-9A-F]{32}$/)
  })

  it('short-history: no forecast at all', async () => {
    const overview = await overviewFor('short-history')
    expect(overview.caveats.historyTooShort).toBe(true)
    expect(overview.growth.windowMonths).toBeLessThan(6)
    expect(overview.growth.forecastStatus).toBe('Unknown')
    expect(overview.growth.forecastExhaustionDate).toBeNull()
  })

  it('only the concealed tenant conceals names', async () => {
    for (const scenario of ['healthy', 'over-entitlement', 'short-history'] as const) {
      const overview = await overviewFor(scenario)
      expect(overview.caveats.namesAreConcealed).toBe(false)
    }
  })
})
