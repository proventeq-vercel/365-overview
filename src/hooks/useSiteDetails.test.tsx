import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataSourceContext } from '../data/useDataSource'
import type { DataSource } from '../data/dataSource'
import type { SiteDirectory } from '../reports/siteDirectory'
import type { StorageRow } from '../types/storage'
import { useKnownSites, useSiteDetails } from './useSiteDetails'

const ALPHA_ID = '0bb0a8e1-1111-4222-8333-944444444444'
const REACT_QUERY_DEFAULT_GC_MS = 5 * 60 * 1000

const alphaRow: StorageRow = {
  pool: 'SharePoint',
  id: ALPHA_ID,
  url: '',
  ownerDisplayName: 'Ada Lovelace',
  storageUsedBytes: 1,
  fileCount: 1,
  activeFileCount: 0,
  lastActivityDate: null,
  isDeleted: false,
}

function harness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const source = {
    getSiteDetails: vi.fn(
      async (): Promise<SiteDirectory> =>
        new Map([[ALPHA_ID, { name: 'Alpha', url: 'https://contoso.sharepoint.com/sites/alpha' }]]),
    ),
  } as unknown as DataSource
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <DataSourceContext.Provider value={source}>{children}</DataSourceContext.Provider>
    </QueryClientProvider>
  )
  return { wrapper }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useKnownSites', () => {
  it('still knows a name whose page has been off screen longer than the cache lifetime', async () => {
    const { wrapper } = harness()
    const page = renderHook(() => useSiteDetails([alphaRow]), { wrapper })
    await waitFor(() => expect(page.result.current.rows[0].name).toBe('Alpha'))

    vi.useFakeTimers()
    page.unmount()
    act(() => {
      vi.advanceTimersByTime(REACT_QUERY_DEFAULT_GC_MS + 1)
    })

    const known = renderHook(() => useKnownSites(), { wrapper })
    expect(known.result.current.get(ALPHA_ID)?.name).toBe('Alpha')
  })
})
