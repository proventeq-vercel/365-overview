import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ApiError } from '@/clients/apiError'
import { DataSourceContext } from '@/data/useDataSource'
import type { DataSource } from '@/data/fixtures'
import { growthWindowDates } from '@/lib/growthWindow'
import { hideRowNames } from '@/lib/hiddenNames'
import type { StorageOverview, StorageRow } from '@/types/storage'
import { useRefreshReport } from './useRefreshReport'
import { REREAD_COOLDOWN_MS, useStorageGrowth } from './useStorageGrowth'

const row = (pool: StorageRow['pool'], id: string, bytes: number): StorageRow => ({
  pool,
  id,
  url: pool === 'SharePoint' ? `https://contoso.sharepoint.com/sites/${id}` : `https://contoso-my.sharepoint.com/personal/${id}`,
  ownerDisplayName: 'An owner',
  storageUsedBytes: bytes,
  fileCount: 1,
  activeFileCount: 1,
  lastActivityDate: '2026-10-20',
  isDeleted: false,
})

const overviewOn = (reportRefreshDate: string, nameMask: 'concealed' | null = null) => {
  const mask = (rows: StorageRow[]) => (nameMask === null ? rows : rows.map(hideRowNames))
  return {
    reportRefreshDate,
    sharePoint: { siteReportRead: true, sites: mask([row('SharePoint', 'busy', 900), row('SharePoint', 'quiet', 5000)]) },
    oneDrive: { accountReportRead: true, drives: mask([row('OneDrive', 'dana', 2000)]) },
    offenders: { read: true },
    caveats: { nameMask },
  } as unknown as StorageOverview
}

const unavailable = () => new ApiError(500, 'Internal Server Error')
const throttled = () => new ApiError(429, 'Too Many Requests')
const offline = () => new ApiError(0, 'Failed to fetch', 'NetworkError')

const sitesActiveOn: Record<string, StorageRow[]> = {
  '2026-10-02': [row('SharePoint', 'busy', 300)],
  '2026-10-15': [row('SharePoint', 'busy', 700)],
}
const drivesActiveOn: Record<string, StorageRow[]> = {
  '2026-10-05': [row('OneDrive', 'dana', 1000)],
}
const sitesOn = async (date: string) => sitesActiveOn[date] ?? []
const drivesOn = async (date: string) => drivesActiveOn[date] ?? []

const bySize = [
  { name: 'quiet', value: 5000 },
  { name: 'dana', value: 2000 },
  { name: 'busy', value: 900 },
]

function renderGrowth(
  source: Partial<DataSource>,
  reportRefreshDate = '2026-10-24',
  client = new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  loadReport?: () => Promise<{ reportRefreshDate: string }>,
  overview = overviewOn(reportRefreshDate),
) {
  const ds = {
    getSiteDetails: async () => new Map(),
    getDailyReportDates: (date: string) => growthWindowDates(date, new Date()),
    getSitesOn: sitesOn,
    getDrivesOn: drivesOn,
    ...source,
  } as DataSource
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <DataSourceContext value={ds}>{children}</DataSourceContext>
    </QueryClientProvider>
  )
  return renderHook(
    () => {
      useQuery({ queryKey: ['storageInputs'], queryFn: loadReport ?? (async () => ({ reportRefreshDate })), retry: false })
      return { growth: useStorageGrowth(overview), ...useRefreshReport() }
    },
    { wrapper },
  )
}

const askedDates = (read: { mock: { calls: unknown[][] } }) => read.mock.calls.map(([date]) => date)

const afterCooldown = () => vi.setSystemTime(Date.now() + REREAD_COOLDOWN_MS)

describe('useStorageGrowth', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-26T16:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('reads both reports for every day Graph accepts and measures each row from the first day it was active', async () => {
    const getSitesOn = vi.fn(sitesOn)
    const getDrivesOn = vi.fn(drivesOn)
    const { result } = renderGrowth({ getSitesOn, getDrivesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    const asked = askedDates(getSitesOn)
    expect([asked.length, asked[0], asked.at(-1), getDrivesOn.mock.calls.length]).toEqual([25, '2026-09-30', '2026-10-24', 25])
    expect(result.current.growth).toMatchObject({
      ranking: 'growth',
      explanation: 'growth',
      baselineDate: '2026-09-30',
      sizesOn: '2026-10-24',
      windowDays: 24,
      windowFrom: '2026-09-30',
      windowTo: '2026-10-24',
      daysInWindow: 25,
      reportsRead: { sharePoint: 25, oneDrive: 25 },
      complete: true,
      missingNote: false,
      measuredRows: 2,
      leaders: [
        { name: 'dana', value: 1000 },
        { name: 'busy', value: 600 },
      ],
    })
  })

  it('skips a report that fails, asking for it once, and keeps the other pool of that day', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === '2026-10-05') throw unavailable()
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(askedDates(getSitesOn).filter((date) => date === '2026-10-05')).toHaveLength(1)
    expect(result.current.growth).toMatchObject({
      ranking: 'growth',
      reportsRead: { sharePoint: 24, oneDrive: 25 },
      complete: false,
      missingNote: true,
      leaders: [
        { name: 'dana', value: 1000 },
        { name: 'busy', value: 600 },
      ],
    })
  })

  it('skips a report that never reached Graph like any other failed report', async () => {
    const getDrivesOn = vi.fn(async (date: string) => {
      if (date === '2026-10-05') throw offline()
      return drivesOn(date)
    })
    const { result } = renderGrowth({ getDrivesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ ranking: 'growth', reportsRead: { sharePoint: 25, oneDrive: 24 } })
  })

  it('starts the window on the first day a report came back', async () => {
    const failOnFirstDay = (read: (date: string) => Promise<StorageRow[]>) => async (date: string) => {
      if (date === '2026-09-30') throw unavailable()
      return read(date)
    }
    const { result } = renderGrowth({ getSitesOn: failOnFirstDay(sitesOn), getDrivesOn: failOnFirstDay(drivesOn) })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ baselineDate: '2026-10-01', windowDays: 23, windowFrom: '2026-09-30', reportsMissing: 2 })
  })

  it('ranks by storage used when no report comes back, after two failed batches of each', async () => {
    const getSitesOn = vi.fn(async () => {
      throw unavailable()
    })
    const getDrivesOn = vi.fn(async () => {
      throw unavailable()
    })
    const { result } = renderGrowth({ getSitesOn, getDrivesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect([getSitesOn.mock.calls.length, getDrivesOn.mock.calls.length]).toEqual([8, 8])
    expect(result.current.growth).toMatchObject({
      ranking: 'size',
      explanation: 'noDailyReports',
      baselineDate: null,
      sizesOn: '2026-10-24',
      reportsRead: { sharePoint: 0, oneDrive: 0 },
      missingNote: false,
      leaders: bySize,
    })
  })

  it('reads on past one failed first batch, so a clock a few days behind still measures the rest', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date < '2026-10-04') throw new ApiError(400, 'Only support data for the past 28 days')
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ reportsRead: { sharePoint: 21, oneDrive: 25 }, leaders: [{ name: 'dana' }, { name: 'busy', value: 200 }] })
  })

  it('stops asking a report once a whole batch of it fails after some came back', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date >= '2026-10-04') throw unavailable()
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect([askedDates(getSitesOn).at(-1), result.current.growth?.reportsRead]).toEqual(['2026-10-07', { sharePoint: 4, oneDrive: 25 }])
  })

  it('asks for no daily report, and ranks by storage used, when the report date is older than Graph keeps them', async () => {
    const getSitesOn = vi.fn(async () => [])
    const { result } = renderGrowth({ getSitesOn }, '2026-08-30')
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(getSitesOn).not.toHaveBeenCalled()
    expect(result.current.growth).toMatchObject({ ranking: 'size', explanation: 'reportDateTooOld', daysInWindow: 0, complete: true })
  })

  it('stops asking one report once Graph throttles it, keeping the days of that batch that came back', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === '2026-10-01') throw throttled()
      return sitesOn(date)
    })
    const getDrivesOn = vi.fn(drivesOn)
    const { result } = renderGrowth({ getSitesOn, getDrivesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect([askedDates(getSitesOn).at(-1), getDrivesOn.mock.calls.length]).toEqual(['2026-10-03', 25])
    expect(result.current.growth).toMatchObject({
      ranking: 'growth',
      reportsRead: { sharePoint: 3, oneDrive: 25 },
      leaders: [
        { name: 'dana', value: 1000 },
        { name: 'busy', value: 600 },
      ],
    })
  })

  it('still measures the SharePoint sites when only the OneDrive report is throttled', async () => {
    const getDrivesOn = vi.fn(async () => {
      throw throttled()
    })
    const { result } = renderGrowth({ getDrivesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(getDrivesOn).toHaveBeenCalledTimes(4)
    expect(result.current.growth).toMatchObject({
      ranking: 'growth',
      reportsRead: { sharePoint: 25, oneDrive: 0 },
      leaders: [{ name: 'busy', value: 600 }],
    })
  })

  it('keeps the measured growth, with the rows unnamed, when looking up the site names fails', async () => {
    const getSiteDetails = vi.fn(async () => {
      throw unavailable()
    })
    const { result } = renderGrowth({ getSiteDetails })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(getSiteDetails).toHaveBeenCalledWith(['busy'])
    expect(result.current.growth).toMatchObject({ ranking: 'growth', complete: true, leaders: [{ value: 1000 }, { value: 600 }] })
  })

  it('still ranks by storage used, and says measuring failed, when the query breaks outright', async () => {
    const getSitesOn = vi.fn(async () => {
      throw new TypeError('rows is not iterable')
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({
      ranking: 'size',
      explanation: 'growthFailed',
      sizesOn: '2026-10-24',
      windowFrom: '2026-09-30',
      reportsMissing: 50,
      complete: false,
      leaders: bySize,
    })
  })

  it('dates the stand-in size ranking by the last day of the window when the report carries no date', async () => {
    const getSitesOn = vi.fn(async () => {
      throw new TypeError('rows is not iterable')
    })
    const { result } = renderGrowth({ getSitesOn }, '')
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ explanation: 'growthFailed', sizesOn: '2026-10-26' })
  })

  it('measures a tenant that conceals names, matching the daily rows to the masked report rows, and looks no name up', async () => {
    const getSiteDetails = vi.fn(async () => new Map())
    const { result } = renderGrowth({ getSiteDetails }, '2026-10-24', undefined, undefined, overviewOn('2026-10-24', 'concealed'))
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ ranking: 'growth', measuredRows: 2 })
    expect(getSiteDetails).not.toHaveBeenCalled()
  })

  it('keeps the growth in the cache after the page unmounts, so leaving it does not reset the ten-minute rule', async () => {
    const client = new QueryClient()
    const { result } = renderGrowth({}, '2026-10-24', client)
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(client.getQueryCache().findAll({ queryKey: ['storageGrowth'] })[0].options.gcTime).toBe(Infinity)
  })

  it('dates the sizes by the last day of the window when the report carries no date', async () => {
    const { result } = renderGrowth({ getSitesOn: async () => [], getDrivesOn: async () => [] }, '')
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ ranking: 'size', sizesOn: '2026-10-26' })
  })

  it('keeps at most four days in flight, so a load does not burst into Graph throttling', async () => {
    let inFlight = 0
    let peak = 0
    const getSitesOn = vi.fn(async (date: string) => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(peak).toBe(4)
  })

  it('is not read again by Refresh data once every report came back, since the daily reports only change once a day', async () => {
    const getSitesOn = vi.fn(sitesOn)
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    afterCooldown()
    await act(() => result.current.refresh())
    expect(getSitesOn).toHaveBeenCalledTimes(25)
  })

  it('reuses the measured growth when the page mounts again, instead of reading every day twice', async () => {
    const getSitesOn = vi.fn(sitesOn)
    const client = new QueryClient()
    const first = renderGrowth({ getSitesOn }, '2026-10-24', client)
    await waitFor(() => expect(first.result.current.growth).toBeDefined())
    first.unmount()
    const second = renderGrowth({ getSitesOn }, '2026-10-24', client)
    expect(second.result.current.growth?.measuredRows).toBe(2)
    expect(getSitesOn).toHaveBeenCalledTimes(25)
  })

  it('waits ten minutes after a read that missed reports before Refresh data reads the window again', async () => {
    let failing = true
    const getSitesOn = vi.fn(async (date: string) => {
      if (failing && date === '2026-10-10') throw unavailable()
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.reportsMissing).toBe(1))
    failing = false
    await act(() => result.current.refresh())
    expect(getSitesOn).toHaveBeenCalledTimes(25)
    afterCooldown()
    await act(() => result.current.refresh())
    await waitFor(() => expect(result.current.growth?.complete).toBe(true))
  })

  it('keeps the earlier growth when reading it again brings back fewer reports', async () => {
    let round = 1
    const getSitesOn = vi.fn(async (date: string) => {
      if (round === 1 ? date === '2026-10-10' : date === '2026-10-10' || date === '2026-10-11') throw unavailable()
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.reportsMissing).toBe(1))
    round = 2
    afterCooldown()
    await act(() => result.current.refresh())
    await waitFor(() => expect(getSitesOn).toHaveBeenCalledTimes(50))
    expect(result.current.growth).toMatchObject({ ranking: 'growth', reportsMissing: 1 })
  })

  it('takes the new read when it brings back as many reports as the earlier one', async () => {
    let round = 1
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === (round === 1 ? '2026-10-10' : '2026-10-02')) throw unavailable()
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.leaders[1]).toEqual({ name: 'busy', value: 600, pool: 'SharePoint' }))
    round = 2
    afterCooldown()
    await act(() => result.current.refresh())
    await waitFor(() => expect(result.current.growth?.leaders[1]).toEqual({ name: 'busy', value: 200, pool: 'SharePoint' }))
  })

  it('takes a complete re-read after UTC midnight shortens the window, over a fuller read that missed a report', async () => {
    let failing = true
    const getSitesOn = vi.fn(async (date: string) => {
      if (failing && date === '2026-10-10') throw unavailable()
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toMatchObject({ reportsRead: { sharePoint: 24, oneDrive: 25 }, complete: false }))
    failing = false
    vi.setSystemTime(new Date('2026-10-27T00:45:00Z'))
    await act(() => result.current.refresh())
    await waitFor(() => expect(result.current.growth).toMatchObject({ windowFrom: '2026-10-01', reportsRead: { sharePoint: 24, oneDrive: 24 }, complete: true }))
  })

  it('starts no second read of the days when Refresh data is pressed again while one is running', async () => {
    let hold = false
    const getSitesOn = vi.fn(async (date: string) => {
      if (hold) return new Promise<StorageRow[]>(() => {})
      if (date === '2026-10-10') throw unavailable()
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.reportsMissing).toBe(1))
    hold = true
    afterCooldown()
    act(() => void result.current.refresh())
    await waitFor(() => expect(getSitesOn).toHaveBeenCalledTimes(29))
    act(() => void result.current.refresh())
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(getSitesOn).toHaveBeenCalledTimes(29)
  })

  it('waits ten minutes again after a re-read that broke, while the earlier growth stays on screen', async () => {
    let round = 1
    const getSitesOn = vi.fn(async (date: string) => {
      if (round === 2) throw new TypeError('rows is not iterable')
      if (date === '2026-10-10') throw unavailable()
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.reportsMissing).toBe(1))
    round = 2
    afterCooldown()
    await act(() => result.current.refresh())
    const calls = getSitesOn.mock.calls.length
    await act(() => result.current.refresh())
    expect(getSitesOn).toHaveBeenCalledTimes(calls)
    expect(result.current.growth).toMatchObject({ ranking: 'growth', reportsMissing: 1 })
  })

  it('reads the growth again on Refresh data straight after it failed outright', async () => {
    let broken = true
    const getSitesOn = vi.fn(async (date: string) => {
      if (broken) throw new TypeError('rows is not iterable')
      return sitesOn(date)
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.ranking).toBe('size'))
    broken = false
    await act(() => result.current.refresh())
    await waitFor(() => expect(result.current.growth?.ranking).toBe('growth'))
  })

  it('keeps the size ranking on screen while Refresh data reads a failed growth again', async () => {
    let mode: 'broken' | 'hold' = 'broken'
    const getSitesOn = vi.fn(async () => {
      if (mode === 'broken') throw new TypeError('rows is not iterable')
      return new Promise<StorageRow[]>(() => {})
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.ranking).toBe('size'))
    const calls = getSitesOn.mock.calls.length
    mode = 'hold'
    act(() => void result.current.refresh())
    await waitFor(() => expect(getSitesOn.mock.calls.length).toBeGreaterThan(calls))
    expect(result.current.growth).toMatchObject({ ranking: 'size', explanation: 'growthFailed' })
  })

  it('leaves a partial growth for an old report date alone when Refresh brings a newer one', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === '2026-10-10') throw unavailable()
      return []
    })
    const loadReport = vi
      .fn()
      .mockResolvedValueOnce({ reportRefreshDate: '2026-10-24' })
      .mockResolvedValue({ reportRefreshDate: '2026-10-25' })
    const { result } = renderGrowth({ getSitesOn }, '2026-10-24', undefined, loadReport)
    await waitFor(() => expect(result.current.growth?.reportsMissing).toBe(1))
    const calls = getSitesOn.mock.calls.length
    afterCooldown()
    await act(() => result.current.refresh())
    expect(loadReport).toHaveBeenCalledTimes(2)
    expect(getSitesOn).toHaveBeenCalledTimes(calls)
  })

  it('does not re-read a partial growth when refreshing the report itself fails, so a throttle is not hit twice', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === '2026-10-10') throw unavailable()
      return []
    })
    const loadReport = vi
      .fn()
      .mockResolvedValueOnce({ reportRefreshDate: '2026-10-24' })
      .mockRejectedValue(new Error('429 Too Many Requests'))
    const { result } = renderGrowth({ getSitesOn }, '2026-10-24', undefined, loadReport)
    await waitFor(() => expect(result.current.growth?.reportsMissing).toBe(1))
    const calls = getSitesOn.mock.calls.length
    afterCooldown()
    await act(() => result.current.refresh())
    expect(loadReport).toHaveBeenCalledTimes(2)
    expect(getSitesOn).toHaveBeenCalledTimes(calls)
  })

  it('leaves Refresh data free while only the growth reads are running', async () => {
    const getSitesOn = vi.fn(() => new Promise<StorageRow[]>(() => {}))
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(getSitesOn).toHaveBeenCalled())
    expect([result.current.growth, result.current.isRefreshing]).toEqual([undefined, false])
  })

  it('measures up to the day of the sizes when the report date is ahead of the clock', async () => {
    const getSitesOn = vi.fn(sitesOn)
    const { result } = renderGrowth({ getSitesOn }, '2026-10-28')
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(askedDates(getSitesOn).at(-1)).toBe('2026-10-26')
    expect(result.current.growth).toMatchObject({ sizesOn: '2026-10-28', windowDays: 28, windowTo: '2026-10-26' })
  })
})
