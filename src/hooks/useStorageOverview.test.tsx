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
import { useStorageGrowth } from './useStorageGrowth'
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
  const { unlicensed } = data.oneDrive.attention
  return <p>{unlicensed === null ? 'licences unknown' : `unlicensed ${unlicensed.count}`}</p>
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
    expect(await screen.findByText('unlicensed 1')).toBeInTheDocument()
  })

  it('keeps the unlicensed OneDrives unknown when the licence report could not be read', async () => {
    renderWithData(<Unlicensed />, sourceWith({ getDrives: async () => [ownerDrive('leaver@contoso.com')] }))
    expect(await screen.findByText('licences unknown')).toBeInTheDocument()
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

  it('does not keep asking after a failure access cannot fix', async () => {
    const getSites = refusedOnce(new ApiError(500, 'Graph is down'))
    renderAsTheApp(<Status />, sourceWith({ getSites }))
    expect(await screen.findByText('refused')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(90_000)

    expect(getSites).toHaveBeenCalledTimes(1)
    expect(screen.getByText('refused')).toBeInTheDocument()
  })
})
