/**
 * Tests for useReports hooks.
 *
 * Injection strategy: DataSourceContext is exported from useDataSource.ts and
 * is a plain React context. We wrap renderHook with a JSX Wrapper that provides
 * DataSourceContext.value = createMockDataSource() directly — no MSAL, no
 * env.useMock stubbing required.
 */
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DataSourceContext } from '../data/useDataSource'
import { createMockDataSource } from '../data/fixtures'
import { useSharePoint, useLicenses, useOrg } from './useReports'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const mockDs = createMockDataSource()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={mockDs}>{children}</DataSourceContext>
      </QueryClientProvider>
    )
  }
}

describe('useSharePoint', () => {
  it('resolves to the fixture SharePoint summary for D30', async () => {
    const { result } = renderHook(() => useSharePoint('D30'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Fixtures now generate 2500 sites in addition to the 4 named ones.
    expect(result.current.data?.totalSites).toBe(2504)
    expect(result.current.data?.sites.length).toBe(2504)
  })
})

describe('useLicenses', () => {
  it('resolves to the fixture license list', async () => {
    const { result } = renderHook(() => useLicenses(), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.length).toBeGreaterThan(0)
    expect(result.current.data?.[0].skuPartNumber).toBeTruthy()
  })
})

describe('useOrg', () => {
  it('resolves to the fixture org info', async () => {
    const { result } = renderHook(() => useOrg(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.displayName).toBe('Contoso Ltd')
  })
})

