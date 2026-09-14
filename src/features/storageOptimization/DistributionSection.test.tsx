import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { StorageOverview } from '@/types/storage'
import { DistributionSection } from './DistributionSection'
import { base, unknownEntitlement } from './testFixtures'

afterEach(cleanup)

const GB = 1_073_741_824

const withSlices: StorageOverview = {
  ...base,
  sharePoint: {
    ...base.sharePoint,
    byWorkload: [
      { name: 'SharePoint', value: 300 * GB },
      { name: 'Teams', value: 200 * GB },
    ],
    byTemplate: [
      { name: 'STS#3', value: 300 * GB },
      { name: 'TEAMCHANNEL#0', value: 200 * GB },
    ],
  },
}

describe('DistributionSection', () => {
  it('names the section', () => {
    render(<DistributionSection overview={withSlices} />)
    expect(
      screen.getByRole('heading', { name: /current storage distribution/i }),
    ).toBeInTheDocument()
  })

  it('gives every chart an accessible name', () => {
    render(<DistributionSection overview={withSlices} />)
    const charts = screen.getAllByRole('img')
    expect(charts.length).toBeGreaterThan(0)
    for (const chart of charts) expect(chart).toHaveAccessibleName()
  })

  it('shows the quota gauge when the entitlement is known', () => {
    render(<DistributionSection overview={withSlices} />)
    expect(screen.getByRole('img', { name: /quota usage/i })).toBeInTheDocument()
  })

  it('replaces the gauge with an explanation when the entitlement is unknown', () => {
    render(
      <DistributionSection
        overview={{ ...withSlices, sharePoint: unknownEntitlement.sharePoint }}
      />,
    )
    expect(screen.queryByRole('img', { name: /quota usage/i })).not.toBeInTheDocument()
    expect(screen.getByText(/entitlement unavailable/i)).toBeInTheDocument()
  })

  it('notes under the gauge that the entitlement is an estimate while it is one', () => {
    const { unmount } = render(<DistributionSection overview={withSlices} />)
    expect(screen.getByText(/estimated from licence counts/i)).toBeInTheDocument()
    unmount()

    const measured = {
      ...withSlices,
      caveats: { ...withSlices.caveats, entitlementIsEstimated: false },
    }
    render(<DistributionSection overview={measured} />)
    expect(screen.queryByText(/estimated from licence counts/i)).not.toBeInTheDocument()
  })

  it('includes OneDrive as its own workload slice', () => {
    render(<DistributionSection overview={withSlices} />)
    expect(screen.getByText('OneDrive')).toBeInTheDocument()
  })

  it('says the template grouping will not match the admin centre', () => {
    render(<DistributionSection overview={withSlices} />)
    expect(screen.getByText(/will not match the SharePoint admin centre/i)).toBeInTheDocument()
  })

  it('renders the gauge as a percentage of the SharePoint pool alone, with used over entitled', () => {
    render(<DistributionSection overview={withSlices} />)
    const gauge = screen.getByRole('img', { name: /quota usage/i })
    expect(gauge).toHaveTextContent('50.0%')
    expect(gauge).toHaveTextContent('500 GB / 1000 GB')
  })
})
