import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup, within } from '@testing-library/react'
import { renderWithData } from '@/test/render'
import type { StorageGrowth, StorageOverview, StorageRow } from '@/types/storage'
import { OffendersSection } from './OffendersSection'
import { base } from './testFixtures'

const grown: StorageGrowth = {
  ranking: 'growth',
  explanation: 'growth',
  baselineDate: '2026-08-06',
  sizesOn: '2026-08-30',
  windowDays: 24,
  windowFrom: '2026-08-06',
  windowTo: '2026-08-30',
  daysInWindow: 25,
  reportsRead: { sharePoint: 25, oneDrive: 25 },
  reportsMissing: 0,
  complete: true,
  missingNote: false,
  measuredRows: 40,
  leaders: [
    { name: 'gamma', value: 900 },
    { name: 'dana', value: 400 },
  ],
}
const bySize: StorageGrowth = {
  ...grown,
  ranking: 'size',
  explanation: 'noDailyReports',
  baselineDate: null,
  windowDays: 0,
  reportsRead: { sharePoint: 0, oneDrive: 0 },
  reportsMissing: 50,
  complete: false,
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
    read: true,
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
        "Storage added between 2026-08-06 and 2026-08-30 (24 days), counted from the first day each site or OneDrive was active in the daily usage reports that came back.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/biggest sites & onedrives/i)).not.toBeInTheDocument()
  })

  it('shows a skeleton while the earlier report loads, not an empty chart', () => {
    renderWithData(<OffendersSection overview={withSites} growth={undefined} />)
    expect(screen.getByLabelText('Loading the fastest-growing sites and OneDrives')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Fastest-growing sites & OneDrives' })).not.toBeInTheDocument()
  })

  it('says how many reports of each pool came back, and over which window, when some are missing', () => {
    renderOffenders(withSites, { ...grown, reportsRead: { sharePoint: 20, oneDrive: 25 }, reportsMissing: 5, complete: false, missingNote: true })
    expect(
      screen.getByText(
        'Storage added between 2026-08-06 and 2026-08-30 (24 days), counted from the first day each site or OneDrive was active in the daily usage reports that came back. 20 of the 25 SharePoint and 25 of the 25 OneDrive daily usage reports from 2026-08-06 to 2026-08-30 came back; Refresh data reads them again after ten minutes.',
      ),
    ).toBeInTheDocument()
  })

  it('does not mention missing daily reports when the model gives no note', () => {
    renderOffenders(withSites, { ...grown, reportsRead: { sharePoint: 20, oneDrive: 25 }, complete: false })
    expect(screen.queryByText(/daily usage reports from/)).not.toBeInTheDocument()
  })

  it('charts the sites that freed the most storage when nothing grew, and says so', () => {
    renderOffenders(withSites, { ...grown, ranking: 'shrink', explanation: 'shrink' })
    const chart = screen.getByRole('img', { name: 'Sites & OneDrives that shrank the most' })
    expect(within(chart.parentElement!).getByText('Storage freed')).toBeInTheDocument()
    expect(screen.getByText(/^No site or OneDrive measured between 2026-08-06 and 2026-08-30 \(24 days\) grew\. These freed the most storage/)).toBeInTheDocument()
  })

  it('charts the sites and OneDrives by storage used when no daily report came back, naming the day of the sizes', () => {
    renderOffenders(withSites, bySize)
    const chart = screen.getByRole('img', { name: 'Sites & OneDrives by storage used' })
    expect(within(chart.parentElement!).getByText('Storage used')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Ranked by storage used on 2026-08-30. Growth is measured from Microsoft's daily usage reports, and none of those from 2026-08-06 to 2026-08-30 came back; Refresh data reads them again after ten minutes.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Fastest-growing sites & OneDrives' })).not.toBeInTheDocument()
  })

  const sizeStates: Record<'reportDateTooOld' | 'growthFailed' | 'notMeasured', Partial<StorageGrowth>> = {
    reportDateTooOld: { daysInWindow: 0, windowFrom: null, windowTo: null, reportsMissing: 0, complete: true },
    growthFailed: {},
    notMeasured: { reportsRead: { sharePoint: 25, oneDrive: 25 }, reportsMissing: 0, complete: true },
  }

  it.each([
    [
      'reportDateTooOld',
      "Ranked by storage used on 2026-08-30. Growth is measured from Microsoft's daily usage reports, and this report is too old for the panel to read any of them.",
    ],
    [
      'growthFailed',
      "Ranked by storage used on 2026-08-30. Measuring growth from Microsoft's daily usage reports did not finish this time; Refresh data tries again.",
    ],
    [
      'notMeasured',
      'Ranked by storage used on 2026-08-30, because no live site or OneDrive in this report was active in the daily usage reports that came back.',
    ],
  ] as const)('explains a size ranking for the reason %s', (explanation, text) => {
    renderOffenders(withSites, { ...bySize, ...sizeStates[explanation], explanation })
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('adds how many reports came back to a size ranking that measured nothing from the reports that did', () => {
    renderOffenders(withSites, { ...bySize, explanation: 'notMeasured', reportsRead: { sharePoint: 20, oneDrive: 25 }, reportsMissing: 5, missingNote: true })
    expect(
      screen.getByText(
        'Ranked by storage used on 2026-08-30, because no live site or OneDrive in this report was active in the daily usage reports that came back. 20 of the 25 SharePoint and 25 of the 25 OneDrive daily usage reports from 2026-08-06 to 2026-08-30 came back; Refresh data reads them again after ten minutes.',
      ),
    ).toBeInTheDocument()
  })

  it('says nothing measured changed size, naming the window, when that is why it ranks by size', () => {
    renderOffenders(withSites, { ...bySize, explanation: 'unchanged', baselineDate: '2026-08-06', windowDays: 24, reportsRead: { sharePoint: 25, oneDrive: 25 }, reportsMissing: 0, complete: true, measuredRows: 3 })
    expect(
      screen.getByText('Ranked by storage used on 2026-08-30, because no site or OneDrive measured between 2026-08-06 and 2026-08-30 changed size.'),
    ).toBeInTheDocument()
  })

  it('says there is nothing to rank, rather than drawing an empty chart, when no row holds storage', () => {
    renderOffenders(withSites, { ...bySize, leaders: [] })
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Sites & OneDrives by storage used' })).not.toBeInTheDocument()
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
