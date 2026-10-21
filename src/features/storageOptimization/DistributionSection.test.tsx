import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import type { StorageOverview } from '@/types/storage'
import { DistributionSection } from './DistributionSection'
import { base, overEntitlement, unknownEntitlement } from './testFixtures'

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

  it('lists the seven parts of the usage line in order, each with its size and share', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(parts().map((button) => button.textContent)).toEqual([
      'SharePoint200 GB17.9% of the line',
      'OneDrive120 GB10.7% of the line',
      'Teams170 GB15.2% of the line',
      'Deleted10 GB0.9% of the line',
      'Inactive120 GB10.7% of the line',
      'VersionsNot measured',
      'Free500 GB44.6% of the line',
    ])
  })

  it('draws SharePoint, OneDrive and Teams in their own product colours', () => {
    const { container } = render(<DistributionSection overview={withTemplates} />)
    const fill = (id: string) => (container.querySelector(`[data-segment="${id}"]`) as HTMLElement).style.background
    expect(fill('sharePoint')).toBe(rgb('#038387'))
    expect(fill('oneDrive')).toBe(rgb('#0078d4'))
    expect(fill('teams')).toBe(rgb('#5b5fc7'))
  })

  it('draws only the parts that hold storage, sized by their share', () => {
    const { container } = render(<DistributionSection overview={withTemplates} />)
    const drawn = [...container.querySelectorAll<HTMLElement>('[data-segment]')]
    expect(drawn.map((segment) => segment.dataset.segment)).toEqual([
      'sharePoint',
      'oneDrive',
      'teams',
      'deleted',
      'inactive',
      'free',
    ])
    expect(Number(drawn[0].style.flexGrow)).toBeCloseTo(200 / 1120, 6)
  })

  it('heads the line with the SharePoint pool alone against its entitlement', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('of the 1000 GB SharePoint entitlement used (500 GB)')).toBeInTheDocument()
  })

  it('explains a part in a popover when it is selected', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(part('OneDrive'))
    const popover = await screen.findByRole('dialog', { name: 'OneDrive' })
    expect(popover).toHaveTextContent('120 GB')
    expect(popover).toHaveTextContent('10.7% of the line')
    expect(popover).toHaveTextContent('does not use the SharePoint entitlement')
  })

  it('says versions are not measured and why, rather than showing a size', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(part('Versions'))
    const popover = await screen.findByRole('dialog', { name: 'Versions' })
    expect(popover).toHaveTextContent('Not measured')
    expect(popover).not.toHaveTextContent('of the line')
    expect(popover).toHaveTextContent('without splitting it out')
  })

  it('counts the deleted sites and OneDrives still held', async () => {
    render(<DistributionSection overview={withTemplates} />)
    await userEvent.click(part('Deleted'))
    expect(await screen.findByRole('dialog', { name: 'Deleted' })).toHaveTextContent(
      '4 deleted sites and OneDrives are still held',
    )
  })

  it('marks the free part unknown, not zero, and says where to enter the entitlement', async () => {
    render(<DistributionSection overview={{ ...unknownEntitlement, sharePoint: { ...unknownEntitlement.sharePoint, byTemplate: [] } }} />)
    expect(part('Free')).toHaveTextContent(/^FreeUnknown$/)
    expect(screen.getByText('500 GB of SharePoint storage used. The entitlement is unknown.')).toBeInTheDocument()
    expect(screen.getAllByText(/Enter it under Options, Report settings/)).not.toHaveLength(0)
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

  it('says the template grouping will not match the admin centre', () => {
    render(<DistributionSection overview={withTemplates} />)
    expect(screen.getByText(/will not match the SharePoint admin centre/i)).toBeInTheDocument()
  })
})
