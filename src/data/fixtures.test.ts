import { describe, it, expect } from 'vitest'
import { createMockDataSource } from './fixtures'
import { buildStorageOverview } from '../model/storageOverview'
import { loadSettings } from '../lib/settings'

async function overviewFor(scenario: Parameters<typeof createMockDataSource>[0], hideNames = false) {
  const ds = createMockDataSource(scenario, { hideNames })
  const settings = loadSettings()
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
    oneDriveEntitlementOverrideBytes: settings.oneDriveEntitlementOverrideBytes,
    namesHidden: ds.namesHidden,
  })
}

describe('mock data source', () => {
  it('lists some OneDrive owners without a licence, keyed the way the drives are', async () => {
    const ds = createMockDataSource()
    const [drives, licences] = await Promise.all([ds.getDrives(), ds.getOneDriveLicences()])
    const unlicensed = drives.filter((drive) => licences?.get(drive.id.toLowerCase()) === false)
    expect(unlicensed.length).toBeGreaterThan(0)
    expect(unlicensed.length).toBeLessThan(drives.length / 10)
  })

  it('lists only some rows each day, smaller on earlier days, like Graph’s daily reports', async () => {
    const ds = createMockDataSource()
    const [all, early, late] = await Promise.all([ds.getSites(), ds.getSitesOn('2026-08-10'), ds.getSitesOn('2026-08-25')])
    expect(early.length).toBeLessThan(all.length / 3)
    const fastGrower = all[0]
    const sizeOn = (rows: typeof all) => rows.find((row) => row.id === fastGrower.id)!.storageUsedBytes
    expect(sizeOn(early)).toBeLessThan(sizeOn(late))
    expect(sizeOn(late)).toBeLessThan(fastGrower.storageUsedBytes)
  })

  it('keeps a window of daily reports by its own frozen clock, whatever the real date', () => {
    const dates = createMockDataSource().getDailyReportDates('2026-08-30')
    expect([dates[0], dates.at(-1)]).toEqual(['2026-08-06', '2026-08-30'])
  })

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

  it.each([
    'healthy',
    'over-entitlement',
    'concealed',
    'short-history',
    'onedrive-over-licence',
    'nothing-to-clean',
  ] as const)(
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
      nameMask: null,
      historyTooShort: false,
    })
    expect(overview.growth.forecastStatus).not.toBe('Unknown')
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
    expect(overview.caveats.nameMask).toBe('concealed')
    expect(overview.sharePoint.usedBytes).toBeGreaterThan(0)
    expect(overview.oneDrive.usedBytes).toBeGreaterThan(0)
  })

  it('concealed: every masked row keeps a unique id, and no owner hash survives', async () => {
    const overview = await overviewFor('concealed')
    const rows = [...overview.sharePoint.sites, ...overview.oneDrive.drives]
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
    expect(rows.some((row) => /^[0-9A-F]{32}$/.test(row.ownerDisplayName))).toBe(false)
  })

  it('hidden names: no site name, link or owner name survives, every id stays unique, totals unchanged', async () => {
    const shown = await overviewFor('healthy')
    const hidden = await overviewFor('healthy', true)
    const rows = [...hidden.sharePoint.sites, ...hidden.oneDrive.drives]
    expect(hidden.caveats.nameMask).toBe('hidden')
    expect(rows.every((row) => row.name === undefined && row.url === '')).toBe(true)
    expect(rows.some((row) => /Owner|User/.test(row.ownerDisplayName))).toBe(false)
    expect(rows.some((row) => row.id.includes('@'))).toBe(false)
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
    expect(hidden.sharePoint.usedBytes).toBe(shown.sharePoint.usedBytes)
  })

  it('short-history: no forecast at all', async () => {
    const overview = await overviewFor('short-history')
    expect(overview.caveats.historyTooShort).toBe(true)
    expect(overview.growth.windowMonths).toBeLessThan(6)
    expect(overview.growth.forecastStatus).toBe('Unknown')
    expect(overview.growth.forecastExhaustionDate).toBeNull()
  })

  it('healthy: inactive and deleted sites to clean up, so an after-clean-up forecast', async () => {
    const { afterCleanUp } = (await overviewFor('healthy')).growth
    expect(afterCleanUp.inactiveBytes).toBeGreaterThan(0)
    expect(afterCleanUp.deletedBytes).toBeGreaterThan(0)
    expect(afterCleanUp.unavailableReason).toBeNull()
  })

  it('short-history: something to clean up, but no after-clean-up forecast', async () => {
    const { afterCleanUp } = (await overviewFor('short-history')).growth
    expect(afterCleanUp.removableBytes).toBeGreaterThan(0)
    expect(afterCleanUp.unavailableReason).toBe('historyTooShort')
  })

  it('nothing-to-clean: no inactive or deleted site, so no after-clean-up line', async () => {
    const overview = await overviewFor('nothing-to-clean')
    expect(overview.growth.afterCleanUp.removableBytes).toBe(0)
    expect(overview.growth.afterCleanUp.unavailableReason).toBe('nothingRemovable')
    expect(overview.growth.forecastStatus).not.toBe('Unknown')
  })

  it('only the concealed tenant conceals names', async () => {
    for (const scenario of ['healthy', 'over-entitlement', 'short-history'] as const) {
      const overview = await overviewFor(scenario)
      expect(overview.caveats.nameMask).toBeNull()
    }
  })
})
