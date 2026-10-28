import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithData } from '@/test/render'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import type { DataSource } from '@/data/fixtures'
import type { SiteDirectory } from '@/reports/siteDirectory'
import type { StorageRow } from '@/types/storage'
import { focusManager, QueryClient } from '@tanstack/react-query'
import { queryClient as appQueryClient } from '@/app/queryClient'
import { ApiError } from '@/clients/apiError'
import { CONSENT_GRANTED_KEY } from '@/config/consentReturn'
import { useOrg, useStorageOverview } from './useStorageOverview'
import { REREAD_COOLDOWN_MS, useStorageGrowth } from './useStorageGrowth'
import { useRefreshReport } from './useRefreshReport'

const FINANCE_ID = '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718'
const LEGAL_ID = 'c3d4e5f6-0718-4f60-a1b2-8f3c1a2b9d4e'

const site = (id: string, storageUsedBytes: number): StorageRow => ({
  pool: 'SharePoint',
  id,
  url: '',
  ownerDisplayName: 'SharePoint Admin',
  storageUsedBytes,
  fileCount: 1,
  activeFileCount: 1,
  lastActivityDate: '2026-09-01',
  isDeleted: false,
  template: 'Team Site',
})

const directory: SiteDirectory = new Map([
  [FINANCE_ID, { name: 'Finance', url: 'https://contoso.sharepoint.com/sites/finance' }],
])

function Probe() {
  const { data } = useStorageOverview(DEFAULT_SETTINGS)
  if (!data) return <p>pending</p>
  return (
    <ul>
      {data.offenders.rows.map((row) => (
        <li key={row.id}>{`${row.id}=${row.name ?? '(unnamed)'}`}</li>
      ))}
    </ul>
  )
}

function sourceWith(over: Partial<DataSource> = {}) {
  return {
    getSites: async () => [site(FINANCE_ID, 900), site(LEGAL_ID, 100)],
    getSiteDirectory: async () => directory,
    getSiteDetails: async () => new Map() as SiteDirectory,
    getDrives: async () => [],
    getSharePointTrend: async () => [],
    getOneDriveTrend: async () => [],
    getLicenses: async () => [],
    getOneDriveLicences: async () => null,
    getReportRefreshDate: async () => '2026-09-20',
    getOrg: async () => ({ displayName: 'Contoso' }),
    ...over,
  } as DataSource
}

function Unlicensed() {
  const { data } = useStorageOverview(DEFAULT_SETTINGS)
  if (!data) return <p>pending</p>
  const unlicensed = data.oneDrive.attention?.unlicensed
  if (!unlicensed) return <p>no account report</p>
  return <p>{`${unlicensed.basis} ${unlicensed.count}`}</p>
}

const ownerDrive = (id: string): StorageRow => ({ ...site(id, 50), pool: 'OneDrive', template: undefined, allocatedBytes: 100 })

describe('useStorageOverview', () => {
  it('reads who holds a OneDrive licence and counts the OneDrives of owners without one', async () => {
    renderWithData(
      <Unlicensed />,
      sourceWith({
        getDrives: async () => [ownerDrive('ada@contoso.com'), ownerDrive('leaver@contoso.com')],
        getOneDriveLicences: async () => new Map([['ada@contoso.com', true], ['leaver@contoso.com', false]]),
      }),
    )
    expect(await screen.findByText('licences 1')).toBeInTheDocument()
  })

  it('counts the quiet OneDrives in place of the unlicensed ones when the licence report could not be read', async () => {
    const quiet = { ...ownerDrive('leaver@contoso.com'), lastActivityDate: '2026-01-01' }
    renderWithData(<Unlicensed />, sourceWith({ getDrives: async () => [quiet, ownerDrive('busy@contoso.com')] }))
    expect(await screen.findByText('noActivity 1')).toBeInTheDocument()
  })

  it('names the report rows from the tenant directory', async () => {
    renderWithData(<Probe />, sourceWith())

    expect(await screen.findByText(`${FINANCE_ID}=Finance`)).toBeInTheDocument()
  })

  it('leaves a row the directory does not cover to the per-row lookup', async () => {
    renderWithData(<Probe />, sourceWith())

    expect(await screen.findByText(`${LEGAL_ID}=(unnamed)`)).toBeInTheDocument()
  })

  it('asks the per-site lookup only for the top sites the directory missed', async () => {
    const getSiteDetails = vi.fn(async () => new Map() as SiteDirectory)
    renderWithData(<Probe />, sourceWith({ getSiteDetails }))

    await waitFor(() => expect(getSiteDetails).toHaveBeenCalled())
    expect(getSiteDetails).toHaveBeenCalledWith([LEGAL_ID])
  })

  it('looks up no site name and applies no directory name when the tenant conceals names', async () => {
    const getSiteDetails = vi.fn(async () => directory)
    const concealed = (id: string, bytes: number) => ({
      ...site(id, bytes),
      ownerDisplayName: '2C4A3F1E9B7D5A6C8E0F1A2B3C4D5E6F',
    })
    renderWithData(
      <Probe />,
      sourceWith({ getSites: async () => [concealed(FINANCE_ID, 900), concealed(LEGAL_ID, 100)], getSiteDetails }),
    )

    expect(await screen.findAllByText(/=\(unnamed\)$/)).toHaveLength(2)
    expect(screen.queryByText(/Finance/)).not.toBeInTheDocument()
    expect(getSiteDetails).not.toHaveBeenCalled()
  })

  it('renders the report when the tenant directory is unavailable', async () => {
    renderWithData(<Probe />, sourceWith({ getSiteDirectory: async () => new Map() }))

    expect(await screen.findByText(`${FINANCE_ID}=(unnamed)`)).toBeInTheDocument()
  })
})

describe('useStorageOverview when a report does not come back', () => {
  const DOWN = new ApiError(500, 'Internal server error', 'InternalServerError')

  function Unread() {
    const { data, error, notReloaded } = useStorageOverview(DEFAULT_SETTINGS)
    const { refresh, isRefreshing } = useRefreshReport()
    if (error) return <p>whole page failed</p>
    if (!data) return <p>pending</p>
    return (
      <>
        <p>{`unread: ${data.caveats.unreadReports.join(',') || 'none'}; sites ${data.sharePoint.siteCount}`}</p>
        <p>{`as of ${data.reportRefreshDate}; drives ${data.oneDrive.driveCount}`}</p>
        <p>{isRefreshing ? 'refreshing' : 'settled'}</p>
        <p>{notReloaded === null ? 'current load' : `earlier load kept, not reloaded: ${notReloaded.join(',') || 'any'}`}</p>
        <button type="button" onClick={() => void refresh()}>
          refresh
        </button>
      </>
    )
  }

  it('renders the reports that came back and names the one that did not', async () => {
    renderWithData(<Unread />, sourceWith({ getDrives: async () => Promise.reject(DOWN) }))
    expect(await screen.findByText('unread: drives; sites 2')).toBeInTheDocument()
  })

  it('reads a failed report once more before leaving it out', async () => {
    let calls = 0
    const getDrives = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw DOWN
      return []
    })
    renderWithData(<Unread />, sourceWith({ getDrives }))
    expect(await screen.findByText('unread: none; sites 2')).toBeInTheDocument()
    expect(getDrives).toHaveBeenCalledTimes(2)
  })

  it('does not ask a throttled report again, since the Graph client already waited and retried it', async () => {
    const getDrives = vi.fn(async (): Promise<never> => {
      throw new ApiError(503, 'Service unavailable', 'ServiceUnavailable')
    })
    renderWithData(<Unread />, sourceWith({ getDrives }))
    expect(await screen.findByText('unread: drives; sites 2')).toBeInTheDocument()
    expect(getDrives).toHaveBeenCalledTimes(1)
  })

  it('does not ask a refused report again, and shows the access screen', async () => {
    const refused = new ApiError(403, 'Forbidden', 'Forbidden')
    const getOneDriveTrend = vi.fn(async (): Promise<never> => {
      throw refused
    })
    renderWithData(<Unread />, sourceWith({ getOneDriveTrend }))
    expect(await screen.findByText('whole page failed')).toBeInTheDocument()
    expect(getOneDriveTrend).toHaveBeenCalledTimes(1)
  })

  it('renders while any one storage report came back with storage in it', async () => {
    const down = async (): Promise<never> => Promise.reject(DOWN)
    renderWithData(
      <Unread />,
      sourceWith({
        getSites: down,
        getDrives: down,
        getSharePointTrend: down,
        getOneDriveTrend: async () => [{ date: '2026-09-20', value: 60 }],
      }),
    )
    expect(await screen.findByText('unread: sites,drives,sharePointTrend; sites 0')).toBeInTheDocument()
  })

  it('fails the whole page when neither usage report came back and no trend holds storage', async () => {
    const down = async (): Promise<never> => Promise.reject(DOWN)
    renderWithData(
      <Unread />,
      sourceWith({
        getSites: down,
        getDrives: down,
        getSharePointTrend: async () => [{ date: '2026-09-20', value: 0 }],
        getOneDriveTrend: async () => [],
      }),
    )
    expect(await screen.findByText('whole page failed')).toBeInTheDocument()
  })

  it('fails the whole page when no storage report came back', async () => {
    const down = async (): Promise<never> => Promise.reject(DOWN)
    renderWithData(
      <Unread />,
      sourceWith({ getSites: down, getDrives: down, getSharePointTrend: down, getOneDriveTrend: down }),
    )
    expect(await screen.findByText('whole page failed')).toBeInTheDocument()
  })

  it('keeps the report on screen when a refresh brings nothing back', async () => {
    let down = false
    const failing =
      <T,>(value: T) =>
      async () => {
        if (down) throw DOWN
        return value
      }
    const getSites = vi.fn(failing([site(FINANCE_ID, 900), site(LEGAL_ID, 100)]))
    renderWithData(
      <Unread />,
      sourceWith({ getSites, getDrives: failing([]), getSharePointTrend: failing([]), getOneDriveTrend: failing([]) }),
    )
    expect(await screen.findByText('unread: none; sites 2')).toBeInTheDocument()

    down = true
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))

    await waitFor(() => expect(getSites).toHaveBeenCalledTimes(3))
    expect(await screen.findByText('settled')).toBeInTheDocument()
    expect(screen.queryByText('whole page failed')).not.toBeInTheDocument()
    expect(screen.getByText('unread: none; sites 2')).toBeInTheDocument()
  })

  it('keeps the whole page as it was when a refresh fails to bring back a report on screen', async () => {
    let refreshed = false
    const getSites = vi.fn(async () => {
      if (refreshed) throw DOWN
      return [site(FINANCE_ID, 900), site(LEGAL_ID, 100)]
    })
    renderWithData(
      <Unread />,
      sourceWith({
        getSites,
        getReportRefreshDate: async () => (refreshed ? Promise.reject(DOWN) : '2026-09-20'),
        getDrives: async () => (refreshed ? [ownerDrive('ada@contoso.com'), ownerDrive('bo@contoso.com')] : [ownerDrive('ada@contoso.com')]),
      }),
    )
    expect(await screen.findByText('unread: none; sites 2')).toBeInTheDocument()

    refreshed = true
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    await waitFor(() => expect(getSites).toHaveBeenCalledTimes(3))
    expect(await screen.findByText('settled')).toBeInTheDocument()
    expect(screen.getByText('unread: none; sites 2')).toBeInTheDocument()
    expect(screen.getByText('as of 2026-09-20; drives 1')).toBeInTheDocument()
    expect(screen.getByText('earlier load kept, not reloaded: sites')).toBeInTheDocument()

    refreshed = false
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    expect(await screen.findByText('current load')).toBeInTheDocument()
    expect(screen.getByText('unread: none; sites 2')).toBeInTheDocument()
  })

  it('keeps the page when a refresh fails a report on screen while another is still missing', async () => {
    let refreshed = false
    const getDrives = vi.fn(async () => {
      if (refreshed) throw DOWN
      return [ownerDrive('ada@contoso.com')]
    })
    renderWithData(
      <Unread />,
      sourceWith({
        getSites: async () => Promise.reject(DOWN),
        getDrives,
        getSharePointTrend: async () => [{ date: '2026-09-20', value: 900 }],
      }),
    )
    expect(await screen.findByText('unread: sites; sites 0')).toBeInTheDocument()
    expect(screen.getByText('current load')).toBeInTheDocument()

    refreshed = true
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    await waitFor(() => expect(getDrives).toHaveBeenCalledTimes(3))
    expect(await screen.findByText('settled')).toBeInTheDocument()
    expect(screen.getByText('unread: sites; sites 0')).toBeInTheDocument()
    expect(screen.getByText('as of 2026-09-20; drives 1')).toBeInTheDocument()
    expect(screen.getByText('earlier load kept, not reloaded: drives')).toBeInTheDocument()
  })

  it('reads each report at most twice when none came back, with the app query defaults', async () => {
    const down = vi.fn(async (): Promise<never> => {
      throw DOWN
    })
    const client = new QueryClient({ defaultOptions: { queries: appQueryClient.getDefaultOptions().queries } })
    renderWithData(
      <Unread />,
      sourceWith({ getSites: down, getDrives: down, getSharePointTrend: down, getOneDriveTrend: down }),
      client,
    )
    expect(await screen.findByText('whole page failed')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 2500))
    expect(down).toHaveBeenCalledTimes(8)
  })

  it('names the rows from the directory when the name lookup is refused, since Sites.Read.All is optional', async () => {
    const refused = new ApiError(403, 'Forbidden', 'Forbidden')
    renderWithData(<Probe />, sourceWith({ getSiteDetails: async () => Promise.reject(refused) }))
    expect(await screen.findByText(`${FINANCE_ID}=Finance`)).toBeInTheDocument()
  })

  it('still lists the rows when the name lookup fails', async () => {
    renderWithData(<Probe />, sourceWith({ getSiteDetails: async () => Promise.reject(DOWN) }))
    expect(await screen.findByText(`${FINANCE_ID}=Finance`)).toBeInTheDocument()
  })
})

describe('useStorageOverview after access is refused', () => {
  const REFUSED = new ApiError(403, 'An administrator has not granted Reports.Read.All yet.', 'AdminConsentRequired')

  function Status() {
    const { data, error } = useStorageOverview(DEFAULT_SETTINGS)
    const org = useOrg()
    if (error) return <p>refused</p>
    if (!data) return <p>pending</p>
    return <p>{`loaded for ${org.data?.displayName ?? 'unnamed tenant'}`}</p>
  }

  function refusedOnce(error: unknown = REFUSED) {
    let calls = 0
    return vi.fn(async () => {
      calls += 1
      if (calls === 1) throw error
      return [site(FINANCE_ID, 900)]
    })
  }

  function renderAsTheApp(ui: ReactNode, source: DataSource) {
    const client = new QueryClient({
      defaultOptions: { queries: { ...appQueryClient.getDefaultOptions().queries, retry: false } },
    })
    return renderWithData(ui, source, client)
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    sessionStorage.clear()
  })

  it('checks again on its own, so access granted elsewhere shows without a reload', async () => {
    const getSites = refusedOnce()
    renderAsTheApp(<Status />, sourceWith({ getSites }))
    expect(await screen.findByText('refused')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(30_000)

    expect(await screen.findByText('loaded for Contoso')).toBeInTheDocument()
    expect(getSites).toHaveBeenCalledTimes(2)
  })

  it('checks within seconds while a consent just granted is still settling', async () => {
    sessionStorage.setItem(CONSENT_GRANTED_KEY, String(Date.now()))
    const getSites = refusedOnce()
    renderAsTheApp(<Status />, sourceWith({ getSites }))
    expect(await screen.findByText('refused')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(3_000)

    expect(await screen.findByText('loaded for Contoso')).toBeInTheDocument()
    expect(sessionStorage.getItem(CONSENT_GRANTED_KEY)).toBeNull()
  })

  it('checks again when the tab regains focus', async () => {
    renderAsTheApp(<Status />, sourceWith({ getSites: refusedOnce() }))
    expect(await screen.findByText('refused')).toBeInTheDocument()

    focusManager.setFocused(false)
    focusManager.setFocused(true)

    expect(await screen.findByText('loaded for Contoso')).toBeInTheDocument()
  })

  it('reloads the queries the refusal emptied, such as the tenant name, once access works', async () => {
    const getOrg = vi.fn(async () => {
      if (getOrg.mock.calls.length === 1) throw REFUSED
      return { displayName: 'Contoso', verifiedDomain: 'contoso.com', country: 'GB' }
    })
    renderAsTheApp(<Status />, sourceWith({ getSites: refusedOnce(), getOrg }))
    expect(await screen.findByText('refused')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(30_000)

    expect(await screen.findByText('loaded for Contoso')).toBeInTheDocument()
    expect(getOrg).toHaveBeenCalledTimes(2)
  })

  it('leaves a growth that had already loaded alone once access works again', async () => {
    let refuse = false
    const getSites = vi.fn(async () => {
      if (refuse) throw REFUSED
      return [site(FINANCE_ID, 900)]
    })
    const getSitesOn = vi.fn(async () => [site(FINANCE_ID, 400)])
    function WithGrowth() {
      const { data, error } = useStorageOverview(DEFAULT_SETTINGS)
      const growth = useStorageGrowth(data)
      const { refresh } = useRefreshReport()
      return (
        <>
          <p>{error ? 'refused' : growth ? 'grown' : 'pending'}</p>
          <button type="button" onClick={() => void refresh()}>refresh</button>
        </>
      )
    }
    renderAsTheApp(
      <WithGrowth />,
      sourceWith({ getSites, getSitesOn, getDrivesOn: async () => [], getDailyReportDates: () => ['2026-09-19', '2026-09-20'] }),
    )
    expect(await screen.findByText('grown')).toBeInTheDocument()
    refuse = true
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    expect(await screen.findByText('refused')).toBeInTheDocument()
    refuse = false

    await vi.advanceTimersByTimeAsync(30_000)

    expect(await screen.findByText('grown')).toBeInTheDocument()
    expect(getSites).toHaveBeenCalledTimes(3)
    expect(getSitesOn).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['reads a growth that missed a report again once access works again and ten minutes have passed', REREAD_COOLDOWN_MS, 'missing 0', 4],
    ['leaves a growth that missed a report alone when access works again within ten minutes of reading it', 0, 'missing 1', 2],
  ] as const)('%s', async (_, waited, shown, reads) => {
    let refuse = false
    const getSites = vi.fn(async () => {
      if (refuse) throw REFUSED
      return [site(FINANCE_ID, 900)]
    })
    const getSitesOn = vi.fn(async (date: string) => {
      if (date === '2026-09-19' && getSitesOn.mock.calls.length === 1) throw new ApiError(500, 'Graph is down')
      return [site(FINANCE_ID, 400)]
    })
    function WithGrowth() {
      const { data, error } = useStorageOverview(DEFAULT_SETTINGS)
      const growth = useStorageGrowth(data)
      const { refresh } = useRefreshReport()
      return (
        <>
          <p>{error ? 'refused' : growth ? `missing ${growth.reportsMissing}` : 'pending'}</p>
          <button type="button" onClick={() => void refresh()}>refresh</button>
        </>
      )
    }
    renderAsTheApp(
      <WithGrowth />,
      sourceWith({ getSites, getSitesOn, getDrivesOn: async () => [], getDailyReportDates: () => ['2026-09-19', '2026-09-20'] }),
    )
    expect(await screen.findByText('missing 1')).toBeInTheDocument()
    vi.setSystemTime(Date.now() + waited)
    refuse = true
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    expect(await screen.findByText('refused')).toBeInTheDocument()
    refuse = false

    await vi.advanceTimersByTimeAsync(30_000)

    expect(await screen.findByText(shown)).toBeInTheDocument()
    expect(getSitesOn).toHaveBeenCalledTimes(reads)
  })

  it('reads a growth that missed a report again on Refresh data when the report date comes from the storage trend', async () => {
    const down = async (): Promise<never> => {
      throw new ApiError(500, 'Graph is down')
    }
    const getDrivesOn = vi.fn(async (date: string) => {
      if (date === '2026-09-19' && getDrivesOn.mock.calls.length === 1) throw new ApiError(500, 'Graph is down')
      return [ownerDrive('ada@contoso.com')]
    })
    function WithGrowth() {
      const { data } = useStorageOverview(DEFAULT_SETTINGS)
      const growth = useStorageGrowth(data)
      const { refresh } = useRefreshReport()
      return (
        <>
          <p>{growth ? `missing ${growth.reportsMissing}` : 'pending'}</p>
          <button type="button" onClick={() => void refresh()}>refresh</button>
        </>
      )
    }
    renderAsTheApp(
      <WithGrowth />,
      sourceWith({
        getSites: down,
        getReportRefreshDate: down,
        getDrives: async () => [ownerDrive('ada@contoso.com')],
        getSharePointTrend: async () => [{ date: '2026-09-20', value: 900 }],
        getSitesOn: async () => [],
        getDrivesOn,
        getDailyReportDates: () => ['2026-09-19', '2026-09-20'],
      }),
    )
    expect(await screen.findByText('missing 1')).toBeInTheDocument()
    vi.setSystemTime(Date.now() + REREAD_COOLDOWN_MS)

    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))

    expect(await screen.findByText('missing 0')).toBeInTheDocument()
    expect(getDrivesOn).toHaveBeenCalledTimes(4)
  })

  it('measures the sites again once Refresh data brings their usage report back on the same report date', async () => {
    let sitesDown = true
    const getSites = async () => {
      if (sitesDown) throw new ApiError(500, 'Graph is down')
      return [site(FINANCE_ID, 900)]
    }
    function WithGrowth() {
      const { data } = useStorageOverview(DEFAULT_SETTINGS)
      const growth = useStorageGrowth(data)
      const { refresh } = useRefreshReport()
      return (
        <>
          <p>{growth ? `measured ${growth.measuredRows}` : 'pending'}</p>
          <button type="button" onClick={() => void refresh()}>refresh</button>
        </>
      )
    }
    renderAsTheApp(
      <WithGrowth />,
      sourceWith({
        getSites,
        getDrives: async () => [ownerDrive('ada@contoso.com')],
        getSharePointTrend: async () => [{ date: '2026-09-20', value: 900 }],
        getSitesOn: async () => [site(FINANCE_ID, 400)],
        getDrivesOn: async () => [ownerDrive('ada@contoso.com')],
        getDailyReportDates: () => ['2026-09-19', '2026-09-20'],
      }),
    )
    expect(await screen.findByText('measured 1')).toBeInTheDocument()
    sitesDown = false

    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))

    expect(await screen.findByText('measured 2')).toBeInTheDocument()
  })

  it('measures the OneDrives again once Refresh data brings their usage report back on the same report date', async () => {
    let drivesDown = true
    const getDrives = async () => {
      if (drivesDown) throw new ApiError(500, 'Graph is down')
      return [ownerDrive('ada@contoso.com')]
    }
    function WithGrowth() {
      const { data } = useStorageOverview(DEFAULT_SETTINGS)
      const growth = useStorageGrowth(data)
      const { refresh } = useRefreshReport()
      return (
        <>
          <p>{growth ? `measured ${growth.measuredRows}` : 'pending'}</p>
          <button type="button" onClick={() => void refresh()}>refresh</button>
        </>
      )
    }
    renderAsTheApp(
      <WithGrowth />,
      sourceWith({
        getSites: async () => [site(FINANCE_ID, 900)],
        getDrives,
        getSharePointTrend: async () => [{ date: '2026-09-20', value: 900 }],
        getSitesOn: async () => [site(FINANCE_ID, 400)],
        getDrivesOn: async () => [ownerDrive('ada@contoso.com')],
        getDailyReportDates: () => ['2026-09-19', '2026-09-20'],
      }),
    )
    expect(await screen.findByText('measured 1')).toBeInTheDocument()
    drivesDown = false

    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))

    expect(await screen.findByText('measured 2')).toBeInTheDocument()
  })

  it('does not read the growth again when a refresh kept the earlier load', async () => {
    let refreshed = false
    const getDrives = async () => {
      if (refreshed) throw new ApiError(500, 'Graph is down')
      return [ownerDrive('ada@contoso.com')]
    }
    const getDrivesOn = vi.fn(async (date: string) => {
      if (date === '2026-09-19' && getDrivesOn.mock.calls.length === 1) throw new ApiError(500, 'Graph is down')
      return [ownerDrive('ada@contoso.com')]
    })
    function WithGrowth() {
      const { data, notReloaded } = useStorageOverview(DEFAULT_SETTINGS)
      const growth = useStorageGrowth(data)
      const { refresh } = useRefreshReport()
      return (
        <>
          <p>{growth ? `missing ${growth.reportsMissing}` : 'pending'}</p>
          <p>{notReloaded === null ? 'fresh' : 'kept'}</p>
          <button type="button" onClick={() => void refresh()}>refresh</button>
        </>
      )
    }
    renderAsTheApp(
      <WithGrowth />,
      sourceWith({
        getDrives,
        getSitesOn: async () => [],
        getDrivesOn,
        getDailyReportDates: () => ['2026-09-19', '2026-09-20'],
      }),
    )
    expect(await screen.findByText('missing 1')).toBeInTheDocument()
    vi.setSystemTime(Date.now() + REREAD_COOLDOWN_MS)
    refreshed = true

    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))

    expect(await screen.findByText('kept')).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(getDrivesOn).toHaveBeenCalledTimes(2)
    expect(screen.getByText('missing 1')).toBeInTheDocument()
  })

  it('does not keep asking after a failure access cannot fix, once no report came back', async () => {
    const down = vi.fn(async (): Promise<never> => {
      throw new ApiError(500, 'Graph is down')
    })
    renderAsTheApp(
      <Status />,
      sourceWith({ getSites: down, getDrives: down, getSharePointTrend: down, getOneDriveTrend: down }),
    )
    expect(await screen.findByText('refused')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(90_000)

    expect(down).toHaveBeenCalledTimes(8)
    expect(screen.getByText('refused')).toBeInTheDocument()
  })
})
