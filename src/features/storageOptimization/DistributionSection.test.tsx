import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { storageUsage } from '@/model/storageUsage'
import type { StorageOverview, StorageRow } from '@/types/storage'
import { DistributionSection } from './DistributionSection'
import { base, overEntitlement, unknownEntitlement } from './testFixtures'

afterEach(cleanup)

const GB = 1_073_741_824

const storageRow = (overrides: Partial<StorageRow>): StorageRow => ({
  pool: 'SharePoint',
  id: 'id',
  url: '',
  ownerDisplayName: '',
  storageUsedBytes: 0,
  fileCount: 0,
  activeFileCount: 0,
  lastActivityDate: null,
  isDeleted: false,
  ...overrides,
})

const withUsage = (overview: StorageOverview): StorageOverview => ({
  ...overview,
  usage: storageUsage({
    siteReportRead: overview.sharePoint.siteReportRead,
    sites: overview.sharePoint.sites,
    sharePointUsedBytes: overview.sharePoint.usedBytes,
    accountReportRead: overview.oneDrive.accountReportRead,
    drives: overview.oneDrive.drives,
    oneDriveUsedBytes: overview.oneDrive.usedBytes,
  }),
})

const withTemplates: StorageOverview = withUsage({
  ...base,
  sharePoint: {
    ...base.sharePoint,
    sites: [
      storageRow({ id: 'team-site', template: 'STS#3', storageUsedBytes: 300 * GB }),
      storageRow({ id: 'channel', template: 'TEAMCHANNEL#0', storageUsedBytes: 200 * GB }),
      storageRow({ id: 'deleted', template: 'STS#3', storageUsedBytes: 10 * GB, isDeleted: true }),
    ],
    byTemplate: [
      { name: 'STS#3', value: 300 * GB, group: 'named' },
      { name: 'TEAMCHANNEL#0', value: 200 * GB, group: 'named' },
    ],
  },
  oneDrive: {
    ...base.oneDrive,
    drives: [storageRow({ pool: 'OneDrive', id: 'ada', storageUsedBytes: 125 * GB })],
  },
})

const usage = () => screen.getByRole('list', { name: 'Storage usage' })

const rowHeaders = () => [...usage().querySelectorAll<HTMLElement>('[data-row]')]

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

describe('DistributionSection', () => {
  it('names the section', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.getByRole('heading', { name: /current storage distribution/i })).toBeInTheDocument()
  })

  it('gives every chart an accessible name', () => {
    render(<DistributionSection overview={withTemplates} />)
    const charts = screen.getAllByRole('img')
    expect(charts.length).toBeGreaterThan(0)
    for (const chart of charts) expect(chart).toHaveAccessibleName()
  })

  it('gives SharePoint, Teams and OneDrive a line each, with the size and share of what is stored', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(rowHeaders().map((header) => header.textContent)).toEqual([
      'SharePoint300 GB48.0% of stored',
      'Teams200 GB32.0% of stored',
      'OneDrive125 GB20.0% of stored',
    ])
    expect(screen.getByText('625 GB stored in total')).toBeInTheDocument()
  })

  it('draws each source in its own product colour, against the largest source', () => {
    const { container } = render(<DistributionSection overview={withTemplates} />)
    const fill = (id: string) => (container.querySelector(`[data-segment="${id}"]`) as HTMLElement).style.background
    expect(fill('sharePoint')).toBe(rgb('#038387'))
    expect(fill('teams')).toBe(rgb('#5b5fc7'))
    expect(fill('oneDrive')).toBe(rgb('#0078d4'))
    const widths = [...container.querySelectorAll<HTMLElement>('[data-bar-scale]')].map((bar) => bar.style.width)
    expect(widths).toEqual(['100%', `${(200 / 300) * 100}%`, `${(125 / 300) * 100}%`])
  })

  it('explains a source in a popover when it is selected', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(screen.getByRole('button', { name: /^OneDrive/ }))
    expect(await screen.findByRole('dialog', { name: 'OneDrive' })).toHaveTextContent(
      'OneDrive is a separate pool from SharePoint',
    )
  })

  it('says the SharePoint line holds all SharePoint storage, Teams and deleted sites included, when the site usage report did not come back', async () => {
    const unread = withUsage({
      ...withTemplates,
      sharePoint: { ...withTemplates.sharePoint, siteReportRead: false, usedBytes: 520 * GB },
    })
    render(<DistributionSection overview={unread} />)
    expect(rowHeaders().map((header) => header.dataset.row)).toEqual(['sharePoint', 'oneDrive'])
    expect(rowHeaders()[0]).toHaveTextContent('SharePoint520 GB')
    await userEvent.click(screen.getByRole('button', { name: /^SharePoint/ }))
    expect(await screen.findByRole('dialog', { name: 'SharePoint' })).toHaveTextContent(
      'All SharePoint storage, from the SharePoint storage trend, Teams sites and deleted sites included',
    )
  })

  it('says the OneDrive line holds all OneDrive storage, deleted OneDrives included, when the OneDrive usage report did not come back', async () => {
    const unread = withUsage({
      ...withTemplates,
      oneDrive: { ...withTemplates.oneDrive, accountReportRead: false, usedBytes: 140 * GB },
    })
    render(<DistributionSection overview={unread} />)
    expect(rowHeaders()[2]).toHaveTextContent('OneDrive140 GB')
    await userEvent.click(screen.getByRole('button', { name: /^OneDrive/ }))
    expect(await screen.findByRole('dialog', { name: 'OneDrive' })).toHaveTextContent(
      'All OneDrive storage, from the OneDrive storage trend, deleted OneDrives included',
    )
  })

  it('describes the live rows by the usage report they come from', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(screen.getByRole('button', { name: /^Teams/ }))
    expect(await screen.findByRole('dialog', { name: 'Teams' })).toHaveTextContent(
      'Live sites created from Teams channel and group templates',
    )
  })

  it('shows an empty block, not a total or a bar, when no source reports storage', () => {
    const nothing = withUsage({
      ...withTemplates,
      sharePoint: { ...withTemplates.sharePoint, sites: [] },
      oneDrive: { ...withTemplates.oneDrive, drives: [] },
    })
    render(<DistributionSection overview={nothing} />)
    expect(screen.getByText('No storage is reported for SharePoint, Teams or OneDrive yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Storage usage' })).not.toBeInTheDocument()
    expect(screen.queryByText(/stored in total/)).not.toBeInTheDocument()
  })

  it('shows storage usage, never quota usage: no entitlement headline, no free part', () => {
    render(<DistributionSection overview={overEntitlement} />)
    expect(screen.queryByText(/entitlement/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Free$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/over the entitlement/)).not.toBeInTheDocument()
  })

  it('says nothing about versions or ROT, which the lite app does not measure', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.queryByText(/versions?\b/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\bROT\b/)).not.toBeInTheDocument()
    expect(screen.queryByText(/not measured|unknown/i)).not.toBeInTheDocument()
  })

  it('lists no parts under a source, since each holds one', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.queryByRole('list', { name: 'SharePoint' })).not.toBeInTheDocument()
  })

  it('keeps the section when the entitlement is unknown', () => {
    render(<DistributionSection overview={{ ...unknownEntitlement, sharePoint: { ...unknownEntitlement.sharePoint, byTemplate: [] } }} />)
    expect(rowHeaders().map((header) => header.textContent)).toEqual([
      'SharePoint350 GB56.5% of stored',
      'Teams150 GB24.2% of stored',
      'OneDrive120 GB19.4% of stored',
    ])
    expect(screen.getByText('620 GB stored in total')).toBeInTheDocument()
  })

  it('says the template grouping will not match the admin centre', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.getByText(/will not match the SharePoint admin centre/i)).toBeInTheDocument()
  })

  it('labels the not-reported and other template slices from the catalogue, with their storage', () => {
    const grouped: StorageOverview = {
      ...base,
      sharePoint: {
        ...base.sharePoint,
        byTemplate: [
          { name: 'STS#3', value: 300 * GB, group: 'named' },
          { name: '', value: 4 * GB, group: 'notReported' },
          { name: '', value: 2 * GB, group: 'other' },
        ],
      },
    }
    render(<DistributionSection overview={grouped} />)
    const legend = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(legend).toContain('Template not reported · 4 GB')
    expect(legend).toContain('Other · 2 GB')
  })

  it('shows a source too small to round as under 0.1% of stored, not as nothing', () => {
    const tiny = withUsage({
      ...withTemplates,
      oneDrive: { ...withTemplates.oneDrive, drives: [storageRow({ pool: 'OneDrive', id: 'tiny', storageUsedBytes: 100_000 })] },
    })
    render(<DistributionSection overview={tiny} />)
    expect(within(usage()).getByRole('button', { name: /^OneDrive/ })).toHaveTextContent('<0.1% of stored')
  })
})
