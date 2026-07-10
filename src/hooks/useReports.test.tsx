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
import {
  useSharePoint,
  useLicenses,
  useOrg,
  useActiveUsers,
  useOneDrive,
  useTeams,
  useMailbox,
  useEmailActivity,
  useAzureSubscriptions,
  useAzureResourceCounts,
  useAzureCost,
} from './useReports'

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
    expect(result.current.data?.totalSites).toBe(4)
    expect(result.current.data?.sites.length).toBe(4)
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

describe('useActiveUsers', () => {
  it('resolves to a time series with at least 7 points', async () => {
    const { result } = renderHook(() => useActiveUsers('D30'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.length).toBeGreaterThanOrEqual(7)
  })
})

describe('useOneDrive', () => {
  it('resolves to a time series for D7', async () => {
    const { result } = renderHook(() => useOneDrive('D7'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.length).toBeGreaterThan(0)
  })
})

describe('useTeams', () => {
  it('resolves to a time series with date strings', async () => {
    const { result } = renderHook(() => useTeams('D30'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('useMailbox', () => {
  it('resolves to the fixture mailbox summary', async () => {
    const { result } = renderHook(() => useMailbox('D30'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.totalMailboxes).toBe(742)
  })
})

describe('useEmailActivity', () => {
  it('resolves to activity points with send/receive/read fields', async () => {
    const { result } = renderHook(() => useEmailActivity('D30'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0]).toMatchObject({
      send: expect.any(Number),
      receive: expect.any(Number),
      read: expect.any(Number),
    })
  })
})

describe('useAzureSubscriptions', () => {
  it('resolves to the fixture subscriptions list', async () => {
    const { result } = renderHook(() => useAzureSubscriptions(), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.length).toBeGreaterThan(0)
    expect(result.current.data?.[0].subscriptionId).toBeTruthy()
  })
})

describe('useAzureResourceCounts', () => {
  it('resolves resource counts when subId is provided', async () => {
    const { result } = renderHook(() => useAzureResourceCounts('sub1'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.length).toBeGreaterThan(0)
  })

  it('stays disabled (pending, not fetching) when subId is empty', () => {
    const { result } = renderHook(() => useAzureResourceCounts(''), {
      wrapper: makeWrapper(),
    })
    expect(result.current.isPending).toBe(true)
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useAzureCost', () => {
  it('resolves cost data when subId is provided', async () => {
    const { result } = renderHook(() => useAzureCost('sub1'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.amount).toBeGreaterThan(0)
    expect(result.current.data?.subscriptionId).toBe('sub1')
  })

  it('stays disabled (pending, not fetching) when subId is empty', () => {
    const { result } = renderHook(() => useAzureCost(''), {
      wrapper: makeWrapper(),
    })
    expect(result.current.isPending).toBe(true)
    expect(result.current.isFetching).toBe(false)
  })
})
