import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import type { StorageOverview } from '@/types/storage'
import { DistributionSection } from './DistributionSection'
import { base, unknownEntitlement, usageUnreported } from './testFixtures'

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

  it('sizes the OneDrive slice from the live-drive total, not the pool total', () => {
    render(<DistributionSection overview={withSlices} />)
    expect(screen.getByText('OneDrive').closest('li')).toHaveTextContent('OneDrive · 110 GB')
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

  it('says the quota gauge has no usage to show, rather than blaming the entitlement, when the history is missing', () => {
    render(<DistributionSection overview={usageUnreported} />)
    expect(
      screen.getByText('Microsoft 365 returned no storage history, so quota usage cannot be shown'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Tenant entitlement unavailable/)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /quota usage/i })).not.toBeInTheDocument()
  })

  it('leaves OneDrive out of the workload chart, and says so, when its history is missing', () => {
    render(<DistributionSection overview={{ ...withSlices, oneDrive: usageUnreported.oneDrive }} />)
    expect(
      screen.getByText('OneDrive is left out because Microsoft 365 returned no OneDrive storage history'),
    ).toBeInTheDocument()
  })

  it('names the leftover and template-less slices from the catalogue, and leaves real template names alone', () => {
    render(
      <DistributionSection
        overview={{
          ...withSlices,
          sharePoint: {
            ...withSlices.sharePoint,
            byTemplate: [
              { name: 'constructor', value: 300 * GB },
              { name: '__unknown__', value: 200 * GB },
              { name: '__other__', value: 100 * GB },
            ],
          },
        }}
      />,
    )
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText('constructor')).toBeInTheDocument()
    expect(screen.queryByText(/__other__|__unknown__/)).not.toBeInTheDocument()
  })
})
