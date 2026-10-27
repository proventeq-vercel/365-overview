import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import { GrowthSection } from './GrowthSection'
import { base, dailyRate, firstDay, unknownEntitlement } from './testFixtures'

afterEach(cleanup)

const GB = 1_073_741_824
const points = [
  { month: '2026-03', actualUsedBytes: 100 * GB, projectedUsedBytes: null, afterCleanUpBytes: null },
  { month: '2026-04', actualUsedBytes: 110 * GB, projectedUsedBytes: 110 * GB, afterCleanUpBytes: 0 },
  { month: '2026-05', actualUsedBytes: null, projectedUsedBytes: 120 * GB, afterCleanUpBytes: 0 },
]
const withGrowth = { ...base, growth: { ...base.growth, points } }

describe('GrowthSection', () => {
  it('names the section and the trend chart', () => {
    render(<GrowthSection overview={withGrowth} />)
    expect(
      screen.getByRole('heading', { name: /future state & growth impact/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /storage trend/i })).toHaveAccessibleName()
  })

  it('states the exhaustion date when one is forecast', () => {
    const critical = {
      ...withGrowth,
      growth: {
        ...withGrowth.growth,
        forecastStatus: 'Critical' as const,
        forecastExhaustionDate: '2026-12-01',
        forecastMonthsToExhaustion: 3,
      },
    }
    render(<GrowthSection overview={critical} />)
    const callout = screen.getByRole('status')
    expect(callout).toHaveTextContent('Critical')
    expect(callout).toHaveTextContent('Capacity exhausts around December 2026')
    expect(callout).toHaveTextContent(/Procurement or cleanup is needed before then/)
  })

  it('says no action is needed when the exhaustion is years out', () => {
    render(<GrowthSection overview={withGrowth} />)
    const callout = screen.getByRole('status')
    expect(callout).toHaveTextContent('Healthy')
    expect(callout).toHaveTextContent(/capacity needs no action today/)
  })

  it('forecasts from the daily series on short history, and labels the window in days', () => {
    render(<GrowthSection overview={{ ...dailyRate, growth: { ...dailyRate.growth, points } }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Capacity exhausts around January 2030')
    expect(screen.getByRole('status')).toHaveTextContent('Forecast from the last 40 days of storage')
    expect(screen.getByText('Added last 40 days').nextElementSibling).toHaveTextContent('+50 GB')
  })

  it('projects used storage, never an unavailable forecast, without an entitlement', () => {
    render(<GrowthSection overview={{ ...unknownEntitlement, growth: { ...unknownEntitlement.growth, points } }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Projection')
    expect(screen.getByRole('status')).toHaveTextContent('SharePoint storage reaches 560 GB in 6 months')
    expect(screen.queryByText(/unavailable|unknown/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Over entitlement today')).not.toBeInTheDocument()
  })

  it('shows the storage used today and no forecast figures from a single reported day', () => {
    render(<GrowthSection overview={firstDay} />)
    expect(screen.getByRole('status')).toHaveTextContent('500 GB of SharePoint storage in use')
    expect(screen.queryByText('Forecast (6 mo)')).not.toBeInTheDocument()
    expect(screen.queryByText('Avg growth / mo')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Added last/)).not.toBeInTheDocument()
    expect(screen.queryByText('Projected cost if nothing changes')).not.toBeInTheDocument()
    expect(screen.queryByText('Next 12 months')).not.toBeInTheDocument()
    expect(screen.queryByText('Forecast after clean-up (6 mo)')).not.toBeInTheDocument()
    expect(screen.getByText(/could be removed today\. The forecast after clean-up starts once/)).toBeInTheDocument()
  })

  it('says the tenant is already over its entitlement when runway is zero', () => {
    const over = {
      ...withGrowth,
      sharePoint: { ...withGrowth.sharePoint, exhausted: true, remainingBytes: 0, overageBytes: 100 * GB },
      growth: {
        ...withGrowth.growth,
        forecastMonthsToExhaustion: 0,
        forecastExhaustionDate: null,
        forecastStatus: 'Critical' as const,
      },
    }
    render(<GrowthSection overview={over} />)
    const callout = screen.getByRole('status')
    expect(callout).toHaveTextContent('Entitlement already exceeded')
    expect(callout).toHaveTextContent(/already using more than its pooled entitlement/)
  })

  it('qualifies a volatile series rather than hiding the figure', () => {
    const volatile = {
      ...withGrowth,
      growth: { ...withGrowth.growth, seriesIsVolatile: true },
    }
    render(<GrowthSection overview={volatile} />)
    expect(screen.getByRole('status')).toHaveTextContent(/Treat the projection as indicative/)
    expect(screen.getByText('Avg growth / mo')).toBeInTheDocument()
  })

  it('appends the estimated-quota note while the entitlement is estimated', () => {
    render(<GrowthSection overview={withGrowth} />)
    expect(screen.getByText(/estimated from licence counts/i)).toBeInTheDocument()
  })

  it('prices growth identically whether or not the entitlement is known', () => {
    const { unmount } = render(<GrowthSection overview={withGrowth} />)
    expect(
      screen.getByRole('heading', { name: /projected cost if nothing changes/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Next 12 months').nextElementSibling).toHaveTextContent('£288.00')
    expect(screen.getByText('Cumulative, 3 years').nextElementSibling).toHaveTextContent(
      '£1,296.00',
    )
    unmount()

    render(
      <GrowthSection
        overview={{
          ...withGrowth,
          sharePoint: unknownEntitlement.sharePoint,
          cost: unknownEntitlement.cost,
          growth: { ...unknownEntitlement.growth, points },
        }}
      />,
    )
    expect(screen.getByText('Next 12 months').nextElementSibling).toHaveTextContent('£288.00')
  })

  it('reports the mini-stats the model measured', () => {
    render(<GrowthSection overview={withGrowth} />)
    expect(screen.getByText('Added last 5 mo').nextElementSibling).toHaveTextContent('+50 GB')
    expect(screen.getByText('Live sites').nextElementSibling).toHaveTextContent(/^1,089$/)
    expect(screen.getByText('Drives near their quota').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Drives over their licence').nextElementSibling).toHaveTextContent(/^7$/)
    expect(screen.getByText('Used today').nextElementSibling).toHaveTextContent('500 GB')
    expect(screen.getByText('Forecast (6 mo)').nextElementSibling).toHaveTextContent('560 GB')
    expect(screen.getByText('Over entitlement today').nextElementSibling).toHaveTextContent('0 B')
  })

  describe('after clean-up', () => {
    const withCleanUp = (afterCleanUp: Partial<typeof base.growth.afterCleanUp>) => ({
      ...withGrowth,
      growth: { ...withGrowth.growth, afterCleanUp: { ...withGrowth.growth.afterCleanUp, ...afterCleanUp } },
    })
    const row = (label: string) => screen.getByText(label).nextElementSibling

    it('shows what clean-up removes, where the forecast ends and that it stays under the entitlement', () => {
      render(<GrowthSection overview={withGrowth} />)
      expect(row('Removable today')).toHaveTextContent(/^120 GB$/)
      expect(row('Forecast after clean-up (6 mo)')).toHaveTextContent(/^440 GB$/)
      expect(row('Stays under the entitlement')).toHaveTextContent(/^Yes$/)
      expect(screen.getByText(/in live sites with no activity for 3 years/)).toHaveTextContent(
        /Versions are not counted: Microsoft's usage reports do not carry version storage/,
      )
    })

    it('says when the cleaned-up forecast still passes the entitlement', () => {
      render(<GrowthSection overview={withCleanUp({ staysUnderEntitlement: false })} />)
      expect(row('Stays under the entitlement')).toHaveTextContent(/^No$/)
    })

    it('leaves out whether it stays under an unknown entitlement, rather than saying Unknown', () => {
      render(<GrowthSection overview={withCleanUp({ staysUnderEntitlement: null })} />)
      expect(screen.queryByText('Stays under the entitlement')).not.toBeInTheDocument()
      expect(row('Forecast after clean-up (6 mo)')).toHaveTextContent(/^440 GB$/)
    })

    it('says there is nothing to clean up and draws the forecast itself as the line after clean-up', () => {
      render(
        <GrowthSection
          overview={withCleanUp({ inactiveBytes: 0, removableBytes: 0, endBytes: 560 * GB, staysUnderEntitlement: true })}
        />,
      )
      expect(row('Removable today')).toHaveTextContent(/^0 B$/)
      expect(row('Forecast after clean-up (6 mo)')).toHaveTextContent(/^560 GB$/)
      expect(screen.getByText(/^Nothing to clean up: .* so the line after clean-up is the forecast itself\./)).toBeInTheDocument()
    })
  })

  it('leaves drives over licence out, never Unknown, when the licences cannot be read', () => {
    render(
      <GrowthSection
        overview={{
          ...withGrowth,
          oneDrive: { ...withGrowth.oneDrive, entitlementPerUserBytes: null, overEntitlement: null },
        }}
      />,
    )
    expect(screen.queryByText('Drives over their licence')).not.toBeInTheDocument()
    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument()
  })
})
