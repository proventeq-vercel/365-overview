import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { ApiError } from '../clients/apiError'
import { createMockDataSource } from '../data/fixtures'
import type { DataSource } from '../data/dataSource'
import { DataSourceContext } from '../data/useDataSource'
import { useOversharingOverview } from './useOversharingOverview'

function wrapperFor(dataSource: DataSource) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return (
      <QueryClientProvider client={client}>
        <DataSourceContext value={dataSource}>{children}</DataSourceContext>
      </QueryClientProvider>
    )
  }
}

function failing(calls: (keyof DataSource)[], status = 403): DataSource {
  const reject = (): Promise<never> => Promise.reject(new ApiError(status, 'denied'))
  const overrides = Object.fromEntries(calls.map((call) => [call, reject])) as Partial<DataSource>
  return { ...createMockDataSource('exposed'), ...overrides }
}

describe('useOversharingOverview', () => {
  it('builds the overview from the fixture tenant', async () => {
    const { result } = renderHook(() => useOversharingOverview(), {
      wrapper: wrapperFor(createMockDataSource('exposed')),
    })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.overview?.tenant?.displayName).toBe('Contoso Ltd')
    expect(result.current.overview?.scope?.sites).toBe(2500)
    expect(result.current.overview?.reportRefreshDate).toBe('2026-09-07')
    expect(result.current.overview?.caveats.reportLagDays).not.toBeNull()
    expect(result.current.overview?.unavailable).toEqual([])
    expect(result.current.isEverythingUnavailable).toBe(false)
  })

  it('keeps the report when one call is forbidden, and names the section', async () => {
    const { result } = renderHook(() => useOversharingOverview(), {
      wrapper: wrapperFor(failing(['getTenantSharingSettings'])),
    })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.overview?.scope?.sites).toBe(2500)
    expect(result.current.overview?.posture).toBeNull()
    expect(result.current.overview?.unavailable).toEqual([{ section: 'sharingPosture', reason: 'role' }])
    expect(result.current.isEverythingUnavailable).toBe(false)
  })

  it('distinguishes missing consent from a missing role', async () => {
    const consentError = Object.assign(new Error('AADSTS65001'), { name: 'InteractionRequiredAuthError' })
    const base = createMockDataSource('exposed')
    const source: DataSource = { ...base, getGuests: () => Promise.reject(consentError) }
    const { result } = renderHook(() => useOversharingOverview(), { wrapper: wrapperFor(source) })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.overview?.unavailable).toEqual([{ section: 'guests', reason: 'consent' }])
    expect(result.current.overview?.external.guests).toBeNull()
  })

  it('reports the reports-reader fixture as posture-less but otherwise complete', async () => {
    const { result } = renderHook(() => useOversharingOverview(), {
      wrapper: wrapperFor(createMockDataSource('reports-reader')),
    })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.overview?.posture).toBeNull()
    expect(result.current.overview?.guestPolicy).toBeNull()
    expect(result.current.overview?.globalAdmins).toBeNull()
    expect(result.current.overview?.links).not.toBeNull()
    expect(result.current.overview?.unavailable.map((u) => u.section).sort()).toEqual([
      'globalAdmins',
      'guestPolicy',
      'sharingPosture',
    ])
  })

  it('flags a tenant where nothing at all could be read', async () => {
    const everyCall: (keyof DataSource)[] = Object.keys(createMockDataSource('exposed')) as (keyof DataSource)[]
    const { result } = renderHook(() => useOversharingOverview(), { wrapper: wrapperFor(failing(everyCall)) })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.isEverythingUnavailable).toBe(true)
    expect(result.current.overview?.links).toBeNull()
  })
})
