import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import type { StorageOverview } from '@/types/storage'
import { DistributionSection } from './DistributionSection'
import { base, firstDay, overEntitlement, unknownEntitlement } from './testFixtures'

afterEach(cleanup)

const GB = 1_073_741_824

const withTemplates: StorageOverview = {
  ...base,
  sharePoint: {
    ...base.sharePoint,
    byTemplate: [
      { name: 'STS#3', value: 300 * GB, group: 'named' },
      { name: 'TEAMCHANNEL#0', value: 200 * GB, group: 'named' },
    ],
  },
}

const parts = () => within(screen.getByRole('list', { name: 'Storage usage' })).getAllByRole('button')

const part = (label: string) => parts().find((button) => button.textContent?.startsWith(label))!

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

  it('lists the five SharePoint parts of the usage line in order, each with its size and share', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(parts().map((button) => button.textContent)).toEqual([
      'SharePoint200 GB20.0% of the line',
      'Teams170 GB17.0% of the line',
      'Deleted10 GB1.0% of the line',
      'Inactive120 GB12.0% of the line',
      'Free500 GB50.0% of the line',
    ])
  })

  it('draws SharePoint and Teams in their own product colours', () => {
    const { container } = render(<DistributionSection overview={withTemplates} />)
    const fill = (id: string) => (container.querySelector(`[data-segment="${id}"]`) as HTMLElement).style.background
    expect(fill('sharePoint')).toBe(rgb('#038387'))
    expect(fill('teams')).toBe(rgb('#5b5fc7'))
  })

  it('draws only the parts that hold storage, sized by their share', () => {
    const { container } = render(<DistributionSection overview={withTemplates} />)
    const drawn = [...container.querySelectorAll<HTMLElement>('[data-segment]')]
    expect(drawn.map((segment) => segment.dataset.segment)).toEqual([
      'sharePoint',
      'teams',
      'deleted',
      'inactive',
      'free',
    ])
    expect(Number(drawn[0].style.flexGrow)).toBeCloseTo(200 / 1000, 6)
  })

  it('heads the line with the SharePoint pool alone against its entitlement', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('of the 1000 GB SharePoint entitlement used (500 GB)')).toBeInTheDocument()
  })

  it('explains a part in a popover when it is selected', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(part('Teams'))
    const popover = await screen.findByRole('dialog', { name: 'Teams' })
    expect(popover).toHaveTextContent('170 GB')
    expect(popover).toHaveTextContent('17.0% of the line')
    expect(popover).toHaveTextContent('Counts against your SharePoint entitlement')
  })

  it('says the SharePoint part holds all SharePoint storage when the site usage report did not come back', async () => {
    const unread: StorageOverview = {
      ...withTemplates,
      sharePoint: { ...withTemplates.sharePoint, siteReportRead: false },
    }
    render(<DistributionSection overview={unread} />)
    await userEvent.click(part('SharePoint'))
    const popover = await screen.findByRole('dialog', { name: 'SharePoint' })
    expect(popover).toHaveTextContent(/^.*All SharePoint storage in use, from the SharePoint storage trend, Teams, inactive and deleted sites included/)
  })

  it('keeps the full subtitle when only the OneDrive report did not come back', () => {
    render(<DistributionSection overview={{ ...withTemplates, oneDrive: { ...withTemplates.oneDrive, read: false } }} />)
    expect(
      screen.getByText(
        'Where storage sits today — every SharePoint workload against your SharePoint entitlement, and which site types drive the volume',
      ),
    ).toBeInTheDocument()
  })

  it('shows no OneDrive pool and no versions in the storage usage panel', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.queryByText('Live OneDrive storage')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Live OneDrive storage' })).not.toBeInTheDocument()
    expect(screen.queryByText(/OneDrives are at 90%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/versions?\b/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/not measured/i)).not.toBeInTheDocument()
  })

  it('counts the deleted sites still held', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(part('Deleted'))
    expect(await screen.findByRole('dialog', { name: 'Deleted' })).toHaveTextContent(
      '4 deleted sites are still held',
    )
  })

  it('dates the inactive part by the same cutoff day the archive card shows', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(part('Inactive'))
    expect(await screen.findByRole('dialog', { name: 'Inactive' })).toHaveTextContent(
      'Live sites with no activity for 3 years (since 30 Aug 2023).',
    )
  })

  it('leaves the free part out, never Unknown, and says where to enter the entitlement', async () => {
    render(<DistributionSection overview={{ ...unknownEntitlement, sharePoint: { ...unknownEntitlement.sharePoint, byTemplate: [] } }} />)
    expect(parts().map((button) => button.textContent)).not.toContainEqual(expect.stringMatching(/^Free/))
    expect(screen.getByText('500 GB of SharePoint storage in use')).toBeInTheDocument()
    expect(screen.queryByText(/ending in what is left of your SharePoint entitlement/)).not.toBeInTheDocument()
    expect(
      screen.getByText('Enter the tenant entitlement in Options, Report settings to see how much of it is left.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument()
  })

  it('says how far over the entitlement a tenant is, with nothing left free', async () => {
    render(<DistributionSection overview={overEntitlement} />)
    expect(screen.getByText('100 GB over the entitlement')).toBeInTheDocument()
    await userEvent.click(part('Free'))
    expect(await screen.findByRole('dialog', { name: 'Free' })).toHaveTextContent(
      'Nothing is left: SharePoint storage is 100 GB over the 1000 GB entitlement.',
    )
  })

  it('notes under the line that the entitlement is an estimate while it is one', () => {
    const { unmount } = render(<DistributionSection overview={withTemplates} />)
    expect(screen.getByText(/estimated from licence counts/i)).toBeInTheDocument()
    unmount()

    const measured = {
      ...withTemplates,
      caveats: { ...withTemplates.caveats, entitlementIsEstimated: false },
    }
    render(<DistributionSection overview={measured} />)
    expect(screen.queryByText(/estimated from licence counts/i)).not.toBeInTheDocument()
  })

  it('calls only the headroom approximate under the line when nothing on the page is priced', () => {
    render(<DistributionSection overview={firstDay} />)
    expect(screen.getByText(/estimated from licence counts/)).toHaveTextContent(/so the headroom is approximate\.$/)
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

  it('shows a SharePoint part too small to round as under 0.1% of the line, not as nothing', () => {
    const segments = withTemplates.breakdown.segments.map((segment) =>
      segment.key === 'deleted' ? { ...segment, bytes: 1_000_000, share: 0.0001 } : segment,
    )
    render(<DistributionSection overview={{ ...withTemplates, breakdown: { ...withTemplates.breakdown, segments } }} />)
    expect(part('Deleted')).toHaveTextContent('<0.1% of the line')
  })

  it('heads a tenant just short of its entitlement with >99.9%, not a rounded 100.0%', () => {
    render(<DistributionSection overview={{ ...withTemplates, sharePoint: { ...withTemplates.sharePoint, usedPercentage: 0.9997 } }} />)
    expect(screen.getByText('>99.9%')).toBeInTheDocument()
  })
})
