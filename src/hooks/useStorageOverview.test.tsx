import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithData } from '@/test/render'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import { ApiError } from '@/clients/apiError'
import type { DataSource } from '@/data/dataSource'
import type { SiteDirectory } from '@/reports/siteDirectory'
import type { StorageRow } from '@/types/storage'
import { useStorageOverview } from './useStorageOverview'

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
    getReportRefreshDate: async () => '2026-09-20',
    getOrg: async () => ({ displayName: 'Contoso' }),
    ...over,
  } as DataSource
}

describe('useStorageOverview', () => {
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

  it('renders the report when the tenant directory is unavailable', async () => {
    renderWithData(<Probe />, sourceWith({ getSiteDirectory: async () => new Map() }))

    expect(await screen.findByText(`${FINANCE_ID}=(unnamed)`)).toBeInTheDocument()
  })

  it('renders the report with its top sites unnamed when the per-site lookup is refused', async () => {
    const getSiteDetails = vi.fn(async (): Promise<SiteDirectory> => {
      throw new ApiError(400, 'Batch request 1 must be a GET of v1.0/sites/{id}.', 'InvalidBatch')
    })
    renderWithData(<Probe />, sourceWith({ getSiteDetails }))

    expect(await screen.findByText(`${LEGAL_ID}=(unnamed)`)).toBeInTheDocument()
    expect(screen.getByText(`${FINANCE_ID}=Finance`)).toBeInTheDocument()
  })
})
