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
      { name: 'STS#3', value: 300 * GB },
      { name: 'TEAMCHANNEL#0', value: 200 * GB },
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

  it('lists the six SharePoint parts of the usage line in order, each with its size and share', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(parts().map((button) => button.textContent)).toEqual([
      'SharePoint200 GB20.0% of the line',
      'Teams170 GB17.0% of the line',
      'Deleted10 GB1.0% of the line',
      'Inactive120 GB12.0% of the line',
      'VersionsNot measured',
      'Free500 GB50.0% of the line',
    ])
  })

  it('draws SharePoint, OneDrive and Teams in their own product colours', () => {
    const { container } = render(<DistributionSection overview={withTemplates} />)
    const fill = (id: string) => (container.querySelector(`[data-segment="${id}"]`) as HTMLElement).style.background
    expect(fill('sharePoint')).toBe(rgb('#038387'))
    expect(fill('oneDriveUsed')).toBe(rgb('#0078d4'))
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
      'oneDriveUsed',
      'oneDriveFree',
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

  it('shows OneDrive as its own pool against the storage allocated to the OneDrives', async () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.getByRole('heading', { name: 'Live OneDrive storage' })).toBeInTheDocument()
    expect(screen.getByText('3 OneDrives are at 90% or more of their own limits. Each OneDrive stops at its own limit, whatever the pool total.')).toBeInTheDocument()
    expect(screen.getByText('of the 40 TB allocated to 40 OneDrives used (120 GB)')).toBeInTheDocument()
    const pool = within(screen.getByRole('list', { name: 'Live OneDrive storage' })).getAllByRole('button')
    expect(pool.map((button) => button.textContent)).toEqual([
      'Used120 GB0.3% of the allocation',
      'Unused allocation39.9 TB99.7% of the allocation',
    ])
    await userEvent.click(pool[0])
    expect(await screen.findByRole('dialog', { name: 'Used' })).toHaveTextContent('Storage in live OneDrives')
  })

  it('says the OneDrive allocation is unknown, with no bar, when a drive reports none', () => {
    render(
      <DistributionSection
        overview={{ ...withTemplates, oneDrive: { ...withTemplates.oneDrive, pool: { usedBytes: 120 * GB, allocation: null } } }}
      />,
    )
    expect(screen.getByText(/120 GB in live OneDrives\. Microsoft did not report an allocation/)).toBeInTheDocument()
    expect(screen.getByText(/3 OneDrives are at 90% or more of their own limits/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Live OneDrive storage' })).not.toBeInTheDocument()
  })

  it('says versions are not measured and why, rather than showing a size', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(part('Versions'))
    const popover = await screen.findByRole('dialog', { name: 'Versions' })
    expect(popover).toHaveTextContent('Not measured')
    expect(popover).not.toHaveTextContent('of the line')
    expect(popover).toHaveTextContent('without splitting it out')
  })

  it('counts the deleted sites still held', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(part('Deleted'))
    expect(await screen.findByRole('dialog', { name: 'Deleted' })).toHaveTextContent(
      '4 deleted sites are still held',
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

  it('says there is no live OneDrive, not that an allocation is missing, when the report lists none', () => {
    render(
      <DistributionSection
        overview={{
          ...withTemplates,
          oneDrive: { ...withTemplates.oneDrive, driveCount: 0, drivesNearCap: 0, pool: { usedBytes: 0, allocation: null } },
        }}
      />,
    )
    expect(screen.getByText("No live OneDrive is in Microsoft's usage report.")).toBeInTheDocument()
    expect(screen.queryByText(/did not report an allocation/)).not.toBeInTheDocument()
  })

  it('shows a used share too small to round as under 0.1%, not as nothing used', () => {
    const allocation = { allocatedBytes: 10_000 * 1024 * GB, freeBytes: 9_998 * 1024 * GB, usedShare: 0.0002, freeShare: 0.9998 }
    render(
      <DistributionSection
        overview={{ ...withTemplates, oneDrive: { ...withTemplates.oneDrive, pool: { usedBytes: 2 * 1024 * GB, allocation } } }}
      />,
    )
    expect(screen.getByText('<0.1%')).toBeInTheDocument()
    const pool = within(screen.getByRole('list', { name: 'Live OneDrive storage' })).getAllByRole('button')
    expect(pool.map((button) => button.textContent)).toEqual([
      'Used2 TB<0.1% of the allocation',
      'Unused allocation9998 TB>99.9% of the allocation',
    ])
  })

  it('says nothing about full OneDrives when none is near its limit', () => {
    render(<DistributionSection overview={{ ...withTemplates, oneDrive: { ...withTemplates.oneDrive, drivesNearCap: 0 } }} />)
    expect(screen.queryByText(/at 90% or more of/)).not.toBeInTheDocument()
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
