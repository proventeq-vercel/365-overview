import { describe, it, expect } from 'vitest'
import { createMockDataSource } from './fixtures'
import { buildStorageOverview } from '../model/storageOverview'
import { loadSettings } from '../lib/settings'

async function overviewFor(scenario: Parameters<typeof createMockDataSource>[0], hideNames = false) {
  const ds = createMockDataSource(scenario, { hideNames })
  const settings = loadSettings()
  const [sites, drives, sharePointTrend, oneDriveTrend, skus, oneDriveLicences, reportRefreshDate] =
    await Promise.all([
      ds.getSites(),
      ds.getDrives(),
      ds.getSharePointTrend(),
      ds.getOneDriveTrend(),
      ds.getLicenses(),
      ds.getOneDriveLicences(),
      ds.getReportRefreshDate(),
    ])
  return buildStorageOverview({
    sites,
    drives,
    sharePointTrend,
    oneDriveTrend,
    skus,
    oneDriveLicences,
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
    const listedWithout = drives.filter((drive) => licences?.get(drive.id.toLowerCase()) === false)
    const notListed = drives.filter((drive) => !licences?.has(drive.id.toLowerCase()))
    expect(listedWithout.length).toBeGreaterThan(0)
    expect(notListed.length).toBeGreaterThan(0)
    expect(listedWithout.length + notListed.length).toBeLessThan(drives.length / 10)
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
    'no-licences',
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

describe('unlicensed OneDrives in every mock tenant', () => {
  it.each(['healthy', 'concealed'] as const)('finds the unlicensed owners in the %s tenant, names concealed or not', async (scenario) => {
    const { oneDrive, caveats } = await overviewFor(scenario)
    expect(caveats.nameMask).toBe(scenario === 'concealed' ? 'concealed' : null)
    expect(oneDrive.attention.unlicensed?.count).toBe(21)
  })

  it('finds them when the app hides names too', async () => {
    const { oneDrive } = await overviewFor('healthy', true)
    expect(oneDrive.attention.unlicensed?.count).toBe(21)
  })
})

describe('mock scenarios reach every caveat state', () => {
  it('healthy: entitlement estimated, forecast graded, no other caveat', async () => {
    const overview = await overviewFor('healthy')
    expect(overview.caveats).toEqual({
      entitlementIsEstimated: true,
      nameMask: null,
    })
    expect(overview.growth.rateSource).toBe('monthly')
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

  it('short-history: forecast from the daily series, still graded', async () => {
    const overview = await overviewFor('short-history')
    expect(overview.growth.rateSource).toBe('daily')
    expect(overview.growth.windowDays).toBe(31)
    expect(overview.growth.forecastStatus).not.toBe('Unknown')
    expect(overview.growth.avgMonthlyGrowthBytes).toBeGreaterThan(0)
  })

  it('healthy: inactive and deleted sites to clean up, so an after-clean-up forecast', async () => {
    const { afterCleanUp } = (await overviewFor('healthy')).growth
    expect(afterCleanUp.inactiveBytes).toBeGreaterThan(0)
    expect(afterCleanUp.deletedBytes).toBeGreaterThan(0)
    expect(afterCleanUp.endBytes).toBeLessThan((await overviewFor('healthy')).growth.forecastEndBytes)
  })

  it('short-history: something to clean up, with an after-clean-up forecast from the daily series', async () => {
    const { afterCleanUp } = (await overviewFor('short-history')).growth
    expect(afterCleanUp.removableBytes).toBeGreaterThan(0)
    expect(afterCleanUp.endBytes).not.toBeNull()
  })

  it('nothing-to-clean: no inactive or deleted site, so the after-clean-up line is the forecast', async () => {
    const overview = await overviewFor('nothing-to-clean')
    expect(overview.growth.afterCleanUp.removableBytes).toBe(0)
    expect(overview.growth.afterCleanUp.endBytes).toBe(overview.growth.forecastEndBytes)
    expect(overview.growth.forecastStatus).not.toBe('Unknown')
  })

  it('no-licences: no entitlement, so a projection of used storage and no free part', async () => {
    const overview = await overviewFor('no-licences')
    expect(overview.sharePoint.entitledBytes).toBeNull()
    expect(overview.growth.rateSource).toBe('monthly')
    expect(overview.growth.forecastEndBytes).toBeGreaterThan(overview.sharePoint.usedBytes)
    expect(overview.breakdown.segments.map((segment) => segment.key)).not.toContain('free')
  })

  it('first-day: one reported day, so the storage used and no rate, no forecast and no cost', async () => {
    const overview = await overviewFor('first-day')
    expect(overview.growth.rateSource).toBe('none')
    expect(overview.growth.points).toHaveLength(1)
    expect(overview.cost.applies).toBe(false)
    expect(overview.sharePoint.usedBytes).toBeGreaterThan(0)
  })

  it('no-daily-reports: every dated report is throttled, while the report itself loads', async () => {
    const ds = createMockDataSource('no-daily-reports')
    const [date] = ds.getDailyReportDates(await ds.getReportRefreshDate())
    await expect(ds.getSitesOn(date)).rejects.toMatchObject({ status: 429 })
    await expect(ds.getDrivesOn(date)).rejects.toMatchObject({ status: 429 })
    expect((await overviewFor('no-daily-reports')).sharePoint.sites.length).toBeGreaterThan(0)
  })

  it('only the concealed tenant conceals names', async () => {
    for (const scenario of ['healthy', 'over-entitlement', 'short-history'] as const) {
      const overview = await overviewFor(scenario)
      expect(overview.caveats.nameMask).toBeNull()
    }
  })
})
