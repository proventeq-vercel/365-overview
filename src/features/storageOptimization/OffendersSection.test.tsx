import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup, within } from '@testing-library/react'
import { renderWithData } from '@/test/render'
import type { StorageGrowth, StorageOverview, StorageRow } from '@/types/storage'
import { OffendersSection } from './OffendersSection'
import { base } from './testFixtures'

const grown: StorageGrowth = {
  ranking: 'growth',
  sizeRankingReason: null,
  baselineDate: '2026-08-02',
  reportRefreshDate: '2026-08-30',
  sizesOn: '2026-08-30',
  windowDays: 28,
  daysRead: 25,
  daysAsked: 25,
  measuredRows: 40,
  leaders: [
    { name: 'gamma', value: 900 },
    { name: 'dana', value: 400 },
  ],
}
const bySize: StorageGrowth = {
  ...grown,
  ranking: 'size',
  sizeRankingReason: 'noDailyReports',
  baselineDate: null,
  sizesOn: '2026-08-31',
  windowDays: 0,
  daysRead: 0,
  measuredRows: 0,
  leaders: [{ name: 'gamma', value: 5000 }],
}

function renderOffenders(overview: StorageOverview, growth: StorageGrowth | undefined = grown) {
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
    poolUsedBytes: { SharePoint: 1000, OneDrive: 500 },
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
        "Storage added between 2026-08-02 and 2026-08-30 (28 days), counted from the first day in that window each site or OneDrive was active",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/biggest sites & onedrives/i)).not.toBeInTheDocument()
  })

  it('shows a skeleton while the earlier report loads, not an empty chart', () => {
    renderWithData(<OffendersSection overview={withSites} growth={undefined} />)
    expect(screen.getByLabelText('Loading the fastest-growing sites and OneDrives')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Fastest-growing sites & OneDrives' })).not.toBeInTheDocument()
  })

  it('says how many daily reports the growth was measured from when some did not come back', () => {
    renderOffenders(withSites, { ...grown, daysRead: 21 })
    expect(
      screen.getByText(/Measured from 21 of the 25 daily usage reports Microsoft keeps; Refresh data asks for the rest\.$/),
    ).toBeInTheDocument()
  })

  it('does not mention missing daily reports when every one came back', () => {
    renderOffenders(withSites)
    expect(screen.queryByText(/daily usage reports Microsoft keeps/)).not.toBeInTheDocument()
  })

  it('charts the sites that freed the most storage when nothing grew, and says so', () => {
    renderOffenders(withSites, { ...grown, ranking: 'shrink' })
    const chart = screen.getByRole('img', { name: 'Sites & OneDrives that shrank the most' })
    expect(within(chart.parentElement!).getByText('Storage freed')).toBeInTheDocument()
    expect(screen.getByText(/^No site or OneDrive grew between 2026-08-02 and 2026-08-30 \(28 days\)\. These freed the most storage/)).toBeInTheDocument()
  })

  it('charts the largest sites and OneDrives when no daily report came back, naming the day of the sizes', () => {
    renderOffenders(withSites, bySize)
    const chart = screen.getByRole('img', { name: 'Largest sites & OneDrives' })
    expect(within(chart.parentElement!).getByText('Storage used')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Ranked by storage used on 2026-08-31. Growth is measured from Microsoft's daily usage reports, and none came back for the last four weeks.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Fastest-growing sites & OneDrives' })).not.toBeInTheDocument()
  })

  it('says no site was active in the daily reports when that is why it ranks by size', () => {
    renderOffenders(withSites, { ...bySize, sizeRankingReason: 'notMeasured', baselineDate: '2026-08-02', daysRead: 25 })
    expect(
      screen.getByText(
        "Ranked by storage used on 2026-08-31, because no site or OneDrive in this report was active in Microsoft's daily usage reports between 2026-08-02 and 2026-08-30.",
      ),
    ).toBeInTheDocument()
  })

  it('says nothing changed size when that is why it ranks by size', () => {
    renderOffenders(withSites, { ...bySize, sizeRankingReason: 'unchanged', baselineDate: '2026-08-02', daysRead: 25, measuredRows: 3 })
    expect(
      screen.getByText(
        'Ranked by storage used on 2026-08-31, because no site or OneDrive active between 2026-08-02 and 2026-08-30 changed size.',
      ),
    ).toBeInTheDocument()
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
