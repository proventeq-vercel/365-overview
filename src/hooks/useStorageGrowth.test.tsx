import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataSourceContext } from '@/data/useDataSource'
import type { DataSource } from '@/data/fixtures'
import type { StorageOverview, StorageRow } from '@/types/storage'
import { useStorageGrowth } from './useStorageGrowth'

const site = (id: string, bytes: number): StorageRow => ({
  pool: 'SharePoint',
  id,
  url: `https://contoso.sharepoint.com/sites/${id}`,
  ownerDisplayName: 'An owner',
  storageUsedBytes: bytes,
  fileCount: 1,
  activeFileCount: 1,
  lastActivityDate: '2026-10-20',
  isDeleted: false,
})

const overview = {
  reportRefreshDate: '2026-10-24',
  sharePoint: { sites: [site('busy', 900), site('quiet', 5000)] },
  oneDrive: { drives: [] },
  caveats: { nameMask: null },
} as unknown as StorageOverview

const activeOn: Record<string, StorageRow[]> = {
  '2026-10-02': [site('busy', 300)],
  '2026-10-15': [site('busy', 700)],
}

function renderGrowth(source: Partial<DataSource>) {
  const ds = { getSiteDetails: async () => new Map(), getDrivesOn: async () => [], ...source } as DataSource
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <DataSourceContext value={ds}>{children}</DataSourceContext>
    </QueryClientProvider>
  )
  return renderHook(() => useStorageGrowth(overview), { wrapper })
}

describe('useStorageGrowth', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-26T16:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('reads every day Graph accepts and measures each row from the first day it was active', async () => {
    const getSitesOn = vi.fn(async (date: string) => activeOn[date] ?? [])
    const { result } = renderGrowth({ getSitesOn })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(getSitesOn).toHaveBeenCalledTimes(26)
    expect(getSitesOn.mock.calls.map(([date]) => date)).toContain('2026-09-29')
    expect(getSitesOn.mock.calls.map(([date]) => date)).not.toContain('2026-09-28')
    expect(result.current.data).toMatchObject({
      baselineDate: '2026-09-29',
      windowDays: 25,
      topGrowers: [{ name: 'busy', value: 600 }],
    })
  })
})
