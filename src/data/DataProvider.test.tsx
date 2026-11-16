import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider, skipToken, useQuery } from '@tanstack/react-query'
import { render } from '@/test/render'
import { MODES_STORAGE_KEY } from '@/config/modes'
import { MockDataProvider, type MockEnv } from './DataProvider'
import type { DataSource } from './fixtures'
import { MOCK_DELAY_STORAGE_KEY, useMockData, type MockDataState } from './mockData'
import { useDataSource } from './useDataSource'

const mockEnv: MockEnv = {
  mockScenario: 'healthy',
  hideNames: false,
  features: new Set(['optimization.storage.report.overview']),
}

let mock: MockDataState | null = null
let source: DataSource | null = null

function Probe() {
  const ds = useDataSource()
  mock = useMockData()
  source = ds
  const sites = useQuery({ queryKey: ['sites'], queryFn: () => ds.getSites() })
  const watched = useQuery({ queryKey: ['sites'], queryFn: skipToken })
  if (sites.isPending || watched.isPending) return <p>loading</p>
  return <p>{sites.isError ? 'failed' : `${sites.data.length} sites`}</p>
}

function renderProvider(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(
    <QueryClientProvider client={queryClient}>
      <MockDataProvider mockEnv={mockEnv}>
        <Probe />
      </MockDataProvider>
    </QueryClientProvider>,
  )
  return queryClient
}

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('MockDataProvider', () => {
  it('serves the scenario the tab booted with and resets nothing on mount', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const clear = vi.spyOn(queryClient, 'clear')
    renderProvider(queryClient)
    expect(await screen.findByText(/^\d+ sites$/)).toBeInTheDocument()
    expect(mock?.scenario).toBe('healthy')
    expect(mock?.delayMs).toBe(0)
    expect(clear).not.toHaveBeenCalled()
  })

  it('switches the scenario without a reload: drops the cache and reads the new source, also with a skipToken observer', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const clear = vi.spyOn(queryClient, 'clear')
    renderProvider(queryClient)
    await screen.findByText(/^\d+ sites$/)

    act(() => mock?.setScenario('no-site-report'))

    expect(await screen.findByText('failed')).toBeInTheDocument()
    expect(queryClient.getQueryState(['sites'])?.error?.message).not.toMatch(/Missing queryFn/)
    expect(clear).toHaveBeenCalledTimes(1)
    expect(mock?.scenario).toBe('no-site-report')
  })

  it('keeps the switched scenario for the tab in the session store and the URL, in place', () => {
    const routerState = { usr: null, key: 'k1', idx: 3 }
    window.history.replaceState(routerState, '', '/onedrive-usage?admin=true')
    sessionStorage.setItem(
      MODES_STORAGE_KEY,
      JSON.stringify({ useMock: 'true', mockScenario: 'healthy', admin: 'true' }),
    )
    const entries = window.history.length
    renderProvider()

    act(() => mock?.setScenario('no-trends'))

    expect(JSON.parse(sessionStorage.getItem(MODES_STORAGE_KEY)!)).toEqual({
      useMock: 'true',
      mockScenario: 'no-trends',
      admin: 'true',
    })
    const url = new URL(window.location.href)
    expect(url.pathname).toBe('/onedrive-usage')
    expect(url.searchParams.get('mock')).toBe('true')
    expect(url.searchParams.get('scenario')).toBe('no-trends')
    expect(url.searchParams.get('features')).toBe('optimization.storage.report.overview')
    expect(url.searchParams.get('admin')).toBe('true')
    expect(window.history.length).toBe(entries)
    expect(window.history.state).toEqual(routerState)
  })

  it('slows every call of the rebuilt source by the chosen delay and remembers it for the tab', async () => {
    renderProvider()
    await screen.findByText(/^\d+ sites$/)

    act(() => mock?.setDelayMs(800))

    expect(mock?.delayMs).toBe(800)
    expect(sessionStorage.getItem(MOCK_DELAY_STORAGE_KEY)).toBe('800')
    vi.useFakeTimers()
    let settled = false
    void source?.getOrg().then(() => (settled = true))
    await vi.advanceTimersByTimeAsync(799)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe(true)
  })

  it('forgets the delay when it goes back to none', () => {
    sessionStorage.setItem(MOCK_DELAY_STORAGE_KEY, '2000')
    renderProvider()
    act(() => mock?.setDelayMs(0))
    expect(sessionStorage.getItem(MOCK_DELAY_STORAGE_KEY)).toBeNull()
  })

  it.each([
    ['2000', 2000],
    ['123', 0],
    ['soon', 0],
  ])('starts from the delay remembered for the tab (%s)', (stored, delayMs) => {
    sessionStorage.setItem(MOCK_DELAY_STORAGE_KEY, stored)
    renderProvider()
    expect(mock?.delayMs).toBe(delayMs)
  })
})

describe('useMockData', () => {
  it('is null outside mock mode', () => {
    expect(renderHook(() => useMockData()).result.current).toBeNull()
  })
})
