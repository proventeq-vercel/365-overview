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
import { useStorageGrowth } from './useStorageGrowth'

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
    sharePoint: { sites: mask([row('SharePoint', 'busy', 900), row('SharePoint', 'quiet', 5000)]) },
    oneDrive: { drives: mask([row('OneDrive', 'dana', 2000)]) },
    caveats: { nameMask },
  } as unknown as StorageOverview
}

const unavailable = () => new ApiError(500, 'Internal Server Error')
const throttled = () => new ApiError(429, 'Too Many Requests')

const sitesActiveOn: Record<string, StorageRow[]> = {
  '2026-10-02': [row('SharePoint', 'busy', 300)],
  '2026-10-15': [row('SharePoint', 'busy', 700)],
}
const drivesActiveOn: Record<string, StorageRow[]> = {
  '2026-10-05': [row('OneDrive', 'dana', 1000)],
}

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
    getSitesOn: async (date: string) => sitesActiveOn[date] ?? [],
    getDrivesOn: async (date: string) => drivesActiveOn[date] ?? [],
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

describe('useStorageGrowth', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-26T16:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('reads every day Graph accepts and measures each site and OneDrive from the first day it was active', async () => {
    const getSitesOn = vi.fn(async (date: string) => sitesActiveOn[date] ?? [])
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    const asked = getSitesOn.mock.calls.map(([date]) => date)
    expect([asked.length, asked[0], asked.at(-1)]).toEqual([25, '2026-09-30', '2026-10-24'])
    expect(result.current.growth).toMatchObject({
      ranking: 'growth',
      baselineDate: '2026-09-30',
      windowDays: 24,
      daysRead: 25,
      daysAsked: 25,
      measuredRows: 2,
      leaders: [
        { name: 'dana', value: 1000 },
        { name: 'busy', value: 600 },
      ],
    })
  })

  it('skips a failed day, asking for it once, and measures from the days that came back', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === '2026-10-02') throw unavailable()
      return sitesActiveOn[date] ?? []
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(getSitesOn.mock.calls.filter(([date]) => date === '2026-10-02')).toHaveLength(1)
    expect(result.current.growth).toMatchObject({
      ranking: 'growth',
      daysRead: 24,
      daysAsked: 25,
      leaders: [
        { name: 'dana', value: 1000 },
        { name: 'busy', value: 200 },
      ],
    })
  })

  it('starts the window on the first day that came back', async () => {
    const getDrivesOn = vi.fn(async (date: string) => {
      if (date === '2026-09-30') throw unavailable()
      return drivesActiveOn[date] ?? []
    })
    const { result } = renderGrowth({ getDrivesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ baselineDate: '2026-10-01', windowDays: 23 })
  })

  it('ranks by storage used when no daily report comes back, rather than showing nothing', async () => {
    const { result } = renderGrowth({
      getSitesOn: async () => {
        throw unavailable()
      },
    })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({
      ranking: 'size',
      sizeRankingReason: 'noDailyReports',
      baselineDate: null,
      sizesOn: '2026-10-24',
      daysRead: 0,
      daysAsked: 25,
      leaders: [
        { name: 'quiet', value: 5000 },
        { name: 'dana', value: 2000 },
        { name: 'busy', value: 900 },
      ],
    })
  })

  it('asks for no daily report, and ranks by storage used, when the report date is older than Graph keeps them', async () => {
    const getSitesOn = vi.fn(async () => [])
    const { result } = renderGrowth({ getSitesOn }, '2026-08-30')
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(getSitesOn).not.toHaveBeenCalled()
    expect(result.current.growth).toMatchObject({ ranking: 'size', sizeRankingReason: 'reportDateTooOld', daysAsked: 0 })
  })

  it('stops asking for more days once Graph throttles one, and measures from the days already read', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === '2026-10-05') throw throttled()
      return sitesActiveOn[date] ?? []
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(getSitesOn.mock.calls.map(([date]) => date).at(-1)).toBe('2026-10-07')
    expect(result.current.growth).toMatchObject({ ranking: 'growth', daysRead: 7, daysAsked: 25, someDaysMissing: true })
  })

  it('keeps the measured growth, with the rows unnamed, when looking up the site names fails', async () => {
    const getSiteDetails = vi.fn(async () => {
      throw unavailable()
    })
    const { result } = renderGrowth({ getSiteDetails })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(getSiteDetails).toHaveBeenCalled()
    expect(result.current.growth).toMatchObject({ ranking: 'growth', daysRead: 25, leaders: [{ value: 1000 }, { value: 600 }] })
  })

  it('still ranks by storage used, and says measuring failed, when the query breaks outright', async () => {
    const getSitesOn = vi.fn(async () => {
      throw new TypeError('rows is not iterable')
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({
      ranking: 'size',
      sizeRankingReason: 'growthFailed',
      sizesOn: '2026-10-24',
      leaders: [{ name: 'quiet', value: 5000 }, { name: 'dana' }, { name: 'busy' }],
    })
  })

  it('measures a tenant that conceals names, matching the daily rows to the masked report rows', async () => {
    const { result } = renderGrowth({}, '2026-10-24', undefined, undefined, overviewOn('2026-10-24', 'concealed'))
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ ranking: 'growth', measuredRows: 2 })
  })

  it('dates the size ranking by the last day asked when the report carries no date', async () => {
    const { result } = renderGrowth({ getSitesOn: async () => [], getDrivesOn: async () => [] }, '')
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ ranking: 'size', windowEndDate: '2026-10-26', sizesOn: '2026-10-26' })
  })

  it('keeps at most four days in flight, so a load does not burst into Graph throttling', async () => {
    let inFlight = 0
    let peak = 0
    const getSitesOn = vi.fn(async (date: string) => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
      return sitesActiveOn[date] ?? []
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(peak).toBe(4)
  })

  it('is not read again by Refresh data once every day came back, since the daily reports only change once a day', async () => {
    const getSitesOn = vi.fn(async (date: string) => sitesActiveOn[date] ?? [])
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth).toBeDefined())
    await act(() => result.current.refresh())
    expect(getSitesOn).toHaveBeenCalledTimes(25)
  })

  it('reuses the measured growth when the page mounts again, instead of reading every day twice', async () => {
    const getSitesOn = vi.fn(async (date: string) => sitesActiveOn[date] ?? [])
    const client = new QueryClient()
    const first = renderGrowth({ getSitesOn }, '2026-10-24', client)
    await waitFor(() => expect(first.result.current.growth).toBeDefined())
    first.unmount()
    const second = renderGrowth({ getSitesOn }, '2026-10-24', client)
    expect(second.result.current.growth?.measuredRows).toBe(2)
    expect(getSitesOn).toHaveBeenCalledTimes(25)
  })

  it('reads the growth again on Refresh data when a day was missing, so a passing throttle does not stick', async () => {
    let failing = true
    const getSitesOn = vi.fn(async (date: string) => {
      if (failing && date === '2026-10-10') throw unavailable()
      return sitesActiveOn[date] ?? []
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.daysRead).toBe(24))
    failing = false
    await act(() => result.current.refresh())
    await waitFor(() => expect(result.current.growth?.daysRead).toBe(25))
  })

  it('starts no second read of the days when Refresh data is pressed again while one is running', async () => {
    let hold = false
    const getSitesOn = vi.fn(async (date: string) => {
      if (hold) return new Promise<StorageRow[]>(() => {})
      if (date === '2026-10-10') throw unavailable()
      return sitesActiveOn[date] ?? []
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth?.daysRead).toBe(24))
    hold = true
    act(() => void result.current.refresh())
    await waitFor(() => expect(getSitesOn).toHaveBeenCalledTimes(29))
    act(() => void result.current.refresh())
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(getSitesOn).toHaveBeenCalledTimes(29)
  })

  it('reads the growth again on Refresh data after it failed outright', async () => {
    let broken = true
    const getSitesOn = vi.fn(async (date: string) => {
      if (broken) throw new TypeError('rows is not iterable')
      return sitesActiveOn[date] ?? []
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
    expect(result.current.growth).toMatchObject({ ranking: 'size', sizeRankingReason: 'growthFailed' })
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
    await waitFor(() => expect(result.current.growth?.daysRead).toBe(24))
    const calls = getSitesOn.mock.calls.length
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
    await waitFor(() => expect(result.current.growth?.daysRead).toBe(24))
    const calls = getSitesOn.mock.calls.length
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

  it('ends the window today, and says so, when the report date is ahead of the clock', async () => {
    const { result } = renderGrowth({}, '2026-10-28')
    await waitFor(() => expect(result.current.growth).toBeDefined())
    expect(result.current.growth).toMatchObject({ windowEndDate: '2026-10-26', sizesOn: '2026-10-28', windowDays: 26 })
  })
})
