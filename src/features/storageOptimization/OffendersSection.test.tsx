import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithData } from '@/test/render'
import type { StorageGrowth, StorageOverview, StorageRow } from '@/types/storage'
import { OffendersSection } from './OffendersSection'
import type { GrowthState } from './FastestGrowingPanel'
import { base } from './testFixtures'

const growthData: StorageGrowth = {
  baselineDate: '2026-08-02',
  reportRefreshDate: '2026-08-30',
  windowDays: 28,
  topGrowers: [
    { name: 'gamma', value: 900 },
    { name: 'dana', value: 400 },
  ],
}
const grown: GrowthState = { data: growthData, isError: false }

function renderOffenders(overview: StorageOverview, growth: GrowthState = grown) {
  return renderWithData(<OffendersSection overview={overview} growth={growth} />)
}

afterEach(cleanup)

const site = (id: string, bytes: number, over: Partial<StorageRow> = {}): StorageRow => ({
  pool: 'SharePoint',
  id,
  url: `https://c.sharepoint.com/sites/${id}`,
  ownerDisplayName: `Owner ${id}`,
  storageUsedBytes: bytes,
  fileCount: 10,
  activeFileCount: 1,
  lastActivityDate: '2026-08-01',
  isDeleted: false,
  template: 'STS#3',
  ...over,
})

const drive = (id: string, bytes: number): StorageRow => ({
  pool: 'OneDrive',
  id,
  url: `https://c-my.sharepoint.com/personal/${id}`,
  ownerDisplayName: `Drive ${id}`,
  storageUsedBytes: bytes,
  fileCount: 4,
  activeFileCount: 1,
  lastActivityDate: '2026-07-01',
  isDeleted: false,
  allocatedBytes: 1000,
})

const rows = [site('alpha', 300), site('beta', 700), drive('dana', 500)]

const withSites = {
  ...base,
  offenders: {
    rows,
    totalUsedBytes: 1500,
    topSites: [
      { name: 'beta', value: 700 },
      { name: 'alpha', value: 300 },
    ],
    topDrives: [{ name: 'dana', value: 500 }],
    retained: { bytes: 42, count: 2 },
  },
}

describe('OffendersSection', () => {
  it('names the section and charts the fastest-growing sites and OneDrives over the window', () => {
    renderOffenders(withSites)
    expect(screen.getByRole('heading', { name: /main offenders/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fastest-growing sites & OneDrives' })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Storage added between 2026-08-02 and 2026-08-30 (28 days), from Microsoft's usage reports for both days",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/biggest sites & onedrives/i)).not.toBeInTheDocument()
  })

  it('shows a skeleton while the earlier report loads, not an empty chart', () => {
    renderOffenders(withSites, { data: undefined, isError: false })
    expect(screen.getByLabelText('Loading the fastest-growing sites and OneDrives')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Fastest-growing sites & OneDrives' })).not.toBeInTheDocument()
  })

  it('says growth is unavailable, rather than zero, when the earlier report fails', () => {
    renderOffenders(withSites, { data: undefined, isError: true })
    expect(screen.getByText(/Growth is unavailable/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading the fastest-growing sites and OneDrives')).not.toBeInTheDocument()
  })

  it('says nothing grew instead of drawing an empty chart', () => {
    renderOffenders(withSites, { data: { ...growthData, topGrowers: [] }, isError: false })
    expect(screen.getByText('No site or OneDrive grew between 2026-08-02 and 2026-08-30.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Fastest-growing sites & OneDrives' })).not.toBeInTheDocument()
  })

  it('reports deleted content that is still consuming quota', () => {
    renderOffenders(withSites)
    expect(screen.getByText(/deleted but still billing/i)).toBeInTheDocument()
  })

  it('omits the deleted panel when nothing is retained', () => {
    const none = {
      ...withSites,
      offenders: { ...withSites.offenders, retained: { bytes: 0, count: 0 } },
    }
    renderOffenders(none)
    expect(screen.queryByText(/deleted but still billing/i)).not.toBeInTheDocument()
  })

  it('shows the retained total the model counted', () => {
    const both = {
      ...withSites,
      offenders: { ...withSites.offenders, retained: { bytes: 50, count: 3 } },
    }
    renderOffenders(both)
    expect(screen.getByText(/3 sites and drives/i)).toBeInTheDocument()
    expect(screen.getByText('50 B')).toBeInTheDocument()
  })

  it('renders the detail table with a last-activity column', () => {
    renderOffenders(withSites)
    expect(screen.getByRole('columnheader', { name: /last activity/i })).toBeInTheDocument()
  })

  it('lists both pools in the detail table', () => {
    renderOffenders(withSites)
    expect(screen.getByText(/personal\/dana/)).toBeInTheDocument()
    expect(screen.getByText(/sites\/beta/)).toBeInTheDocument()
  })

  it('carries no sales footer under the table', () => {
    renderOffenders(withSites)
    expect(screen.queryByText(/full discovery/i)).not.toBeInTheDocument()
  })

  it('explains concealed names above the table only when the tenant conceals them', () => {
    const { unmount } = renderOffenders(withSites)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    unmount()

    const concealed = { ...withSites, caveats: { ...withSites.caveats, nameMask: 'concealed' as const } }
    renderOffenders(concealed)
    expect(screen.getByRole('status')).toHaveTextContent(/identities below are blurred/i)
  })
})
