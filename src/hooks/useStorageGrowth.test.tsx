import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataSourceContext } from '@/data/useDataSource'
import type { DataSource } from '@/data/fixtures'
import { growthWindowDates } from '@/lib/growthWindow'
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

const overviewOn = (reportRefreshDate: string) =>
  ({
    reportRefreshDate,
    sharePoint: { sites: [row('SharePoint', 'busy', 900), row('SharePoint', 'quiet', 5000)] },
    oneDrive: { drives: [row('OneDrive', 'dana', 2000)] },
    caveats: { nameMask: null },
  }) as unknown as StorageOverview

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
  const overview = overviewOn(reportRefreshDate)
  return renderHook(() => ({ growth: useStorageGrowth(overview), ...useRefreshReport() }), { wrapper })
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
    await waitFor(() => expect(result.current.growth.data).toBeDefined())
    const asked = getSitesOn.mock.calls.map(([date]) => date)
    expect([asked.length, asked[0], asked.at(-1)]).toEqual([25, '2026-09-30', '2026-10-24'])
    expect(result.current.growth.data).toMatchObject({
      baselineDate: '2026-09-30',
      windowDays: 24,
      measuredRows: 2,
      topGrowers: [
        { name: 'dana', value: 1000 },
        { name: 'busy', value: 600 },
      ],
    })
  })

  it('fails the whole panel, once and without a retry, when any daily report fails', async () => {
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === '2026-10-10') throw new Error('429 Too Many Requests')
      return sitesActiveOn[date] ?? []
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth.isError).toBe(true))
    expect(getSitesOn.mock.calls.filter(([date]) => date === '2026-10-10')).toHaveLength(1)
  })

  it('asks for no daily report, and fails, when the report date is older than Graph keeps them', async () => {
    const getSitesOn = vi.fn(async () => [])
    const { result } = renderGrowth({ getSitesOn }, '2026-08-30')
    await waitFor(() => expect(result.current.growth.isError).toBe(true))
    expect(getSitesOn).not.toHaveBeenCalled()
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
    await waitFor(() => expect(result.current.growth.data).toBeDefined())
    expect(peak).toBe(4)
  })

  it('is not read again by Refresh data, since the daily reports only change once a day', async () => {
    const getSitesOn = vi.fn(async (date: string) => sitesActiveOn[date] ?? [])
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth.data).toBeDefined())
    await act(() => result.current.refresh())
    expect(getSitesOn).toHaveBeenCalledTimes(25)
  })

  it('reuses the measured growth when the page mounts again, instead of reading every day twice', async () => {
    const getSitesOn = vi.fn(async (date: string) => sitesActiveOn[date] ?? [])
    const client = new QueryClient()
    const first = renderGrowth({ getSitesOn }, '2026-10-24', client)
    await waitFor(() => expect(first.result.current.growth.data).toBeDefined())
    first.unmount()
    const second = renderGrowth({ getSitesOn }, '2026-10-24', client)
    expect(second.result.current.growth.data?.measuredRows).toBe(2)
    expect(getSitesOn).toHaveBeenCalledTimes(25)
  })

  it('reads a failed growth again on Refresh data, so a passing error does not stick for the session', async () => {
    let failing = true
    const getSitesOn = vi.fn(async (date: string) => {
      if (failing && date === '2026-10-10') throw new Error('503 Service Unavailable')
      return sitesActiveOn[date] ?? []
    })
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.growth.isError).toBe(true))
    failing = false
    await act(() => result.current.refresh())
    await waitFor(() => expect(result.current.growth.data?.measuredRows).toBe(2))
  })

  it('leaves Refresh data free while only the growth reads are running', async () => {
    const { result } = renderGrowth({ getSitesOn: () => new Promise<StorageRow[]>(() => {}) })
    await waitFor(() => expect(result.current.growth.fetchStatus).toBe('fetching'))
    expect(result.current.isRefreshing).toBe(false)
  })

  it('ends the window today, and says so, when the report date is ahead of the clock', async () => {
    const { result } = renderGrowth({}, '2026-10-28')
    await waitFor(() => expect(result.current.growth.data).toBeDefined())
    expect(result.current.growth.data).toMatchObject({ reportRefreshDate: '2026-10-26', windowDays: 26 })
  })
})
