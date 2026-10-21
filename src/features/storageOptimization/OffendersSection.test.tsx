import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup, within } from '@testing-library/react'
import { rgb } from '@/test/colour'
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
    { name: 'gamma', value: 900, pool: 'SharePoint' },
    { name: 'dana', value: 400, pool: 'OneDrive' },
  ],
}
const grown: GrowthState = { data: growthData, isError: false }

function renderOffenders(overview: StorageOverview, growth: GrowthState = grown) {
  return renderWithData(<OffendersSection overview={overview} growth={growth} />)
}

afterEach(cleanup)

const growthPanel = () =>
  screen.getByRole('heading', { name: 'Fastest-growing sites & OneDrives' }).parentElement!.parentElement!

const growthLegend = () =>
  within(growthPanel())
    .queryAllByRole('list')
    .find((list) => !list.hasAttribute('aria-label')) ?? null

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
    expect(screen.getByRole('list', { name: 'Fastest-growing sites & OneDrives' })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Storage added between 2026-08-02 and 2026-08-30 (28 days), from Microsoft's usage reports for both days",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/biggest sites & onedrives/i)).not.toBeInTheDocument()
  })

  it('marks every fastest grower as a SharePoint site or a OneDrive, by icon and product colour', () => {
    renderOffenders(withSites)
    const rows = within(screen.getByRole('list', { name: 'Fastest-growing sites & OneDrives' })).getAllByRole('listitem')
    const summarise = (row: HTMLElement) => {
      const bar = row.querySelector<HTMLElement>('[data-slot="facet-bar"]')!
      const icon = within(row).getByRole('img')
      return [row.textContent, icon.getAttribute('aria-label'), icon.style.color, bar.style.borderLeft]
    }
    expect(rows.map(summarise)).toEqual([
      ['SharePointgamma900 B', 'SharePoint', rgb('#038387'), `3px solid ${rgb('#038387')}`],
      ['OneDrivedana400 B', 'OneDrive', rgb('#0364b8'), `3px solid ${rgb('#0364b8')}`],
    ])
    const fills = rows.map((row) => row.querySelector<HTMLElement>('[data-slot="facet-bar"]')!.style.background)
    expect(fills[0]).toContain(rgb('#038387'))
    expect(fills[1]).toContain(rgb('#0364b8'))
  })

  it('names both products in the growth legend, each in its own colour', () => {
    renderOffenders(withSites)
    const swatch = (name: string) =>
      within(growthLegend()!).getByText(name).closest('li')!.querySelector<HTMLElement>('i')!
    expect(swatch('SharePoint').style.background).toBe(rgb('#038387'))
    expect(swatch('OneDrive').style.background).toBe(rgb('#0364b8'))
  })

  it('keeps grower names hidden behind the hidden-name control and still marks each product', () => {
    renderOffenders({ ...withSites, caveats: { ...withSites.caveats, nameMask: 'hidden' as const } })
    const list = screen.getByRole('list', { name: 'Fastest-growing sites & OneDrives' })
    expect(within(list).getAllByRole('button', { name: 'Hidden name' })).toHaveLength(2)
    expect(within(list).queryByText('gamma')).not.toBeInTheDocument()
    expect(within(list).queryByTitle('gamma')).not.toBeInTheDocument()
    expect(within(list).getAllByRole('img').map((icon) => icon.getAttribute('aria-label'))).toEqual([
      'SharePoint',
      'OneDrive',
    ])
  })

  it('shows a long grower name in full on hover', () => {
    renderOffenders(withSites)
    const list = screen.getByRole('list', { name: 'Fastest-growing sites & OneDrives' })
    expect(within(list).getByText('gamma')).toHaveAttribute('title', 'gamma')
  })

  it('shows no product legend until there are growers to label', () => {
    renderOffenders(withSites, { data: { ...growthData, topGrowers: [] }, isError: false })
    expect(growthLegend()).toBeNull()
    expect(within(growthPanel()).getByText('No site or OneDrive grew between 2026-08-02 and 2026-08-30.')).toBeInTheDocument()
  })

  it('tints the largest sites in SharePoint teal and the largest OneDrives in OneDrive blue', () => {
    renderOffenders(withSites)
    const firstBar = (label: string) =>
      screen.getByRole('list', { name: label }).querySelector<HTMLElement>('[data-slot="facet-bar"]')!.style.background
    expect(firstBar('Top SharePoint sites by storage')).toContain(rgb('#038387'))
    expect(firstBar('Top OneDrives by storage')).toContain(rgb('#0364b8'))
  })

  it('shows a skeleton while the earlier report loads, not an empty chart', () => {
    renderOffenders(withSites, { data: undefined, isError: false })
    const placeholder = screen.getByRole('status', { name: 'Loading the fastest-growing sites and OneDrives' })
    expect(placeholder).toHaveTextContent('Loading the fastest-growing sites and OneDrives')
    expect(placeholder).not.toHaveAttribute('aria-busy')
    expect(screen.queryByRole('list', { name: 'Fastest-growing sites & OneDrives' })).not.toBeInTheDocument()
    expect(growthLegend()).toBeNull()
  })

  it('says growth is unavailable, rather than zero, when the earlier report fails', () => {
    renderOffenders(withSites, { data: undefined, isError: true })
    expect(screen.getByText(/Growth is unavailable/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading the fastest-growing sites and OneDrives')).not.toBeInTheDocument()
    expect(growthLegend()).toBeNull()
  })

  it('says nothing grew instead of drawing an empty chart', () => {
    renderOffenders(withSites, { data: { ...growthData, topGrowers: [] }, isError: false })
    expect(screen.getByText('No site or OneDrive grew between 2026-08-02 and 2026-08-30.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Fastest-growing sites & OneDrives' })).not.toBeInTheDocument()
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
