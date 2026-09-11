import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { GrowthSection } from './GrowthSection'
import { base, shortHistory, unknownEntitlement } from './testFixtures'

afterEach(cleanup)

const GB = 1_073_741_824
const points = [
  { month: '2026-03', actualUsedBytes: 100 * GB, projectedUsedBytes: null },
  { month: '2026-04', actualUsedBytes: 110 * GB, projectedUsedBytes: 110 * GB },
  { month: '2026-05', actualUsedBytes: null, projectedUsedBytes: 120 * GB },
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

  it('refuses a forecast on short history and says it is not an all-clear', () => {
    render(<GrowthSection overview={{ ...shortHistory, growth: { ...shortHistory.growth, points } }} />)
    expect(screen.getByText(/not an all-clear/i)).toBeInTheDocument()
    expect(screen.queryByText(/January 2030/)).not.toBeInTheDocument()
  })

  it('says the tenant is already over its entitlement when runway is zero', () => {
    const over = {
      ...withGrowth,
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

  it('labels the cost as notional when the entitlement is unknown', () => {
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
    expect(screen.getByRole('heading', { name: 'Projected value of growth' })).toBeInTheDocument()
    expect(screen.getByText(/this is not billable spend/)).toBeInTheDocument()
    expect(screen.getByText('Over entitlement today').nextElementSibling).toHaveTextContent('Unknown')
  })

  it('shows the billable cost when the entitlement is known', () => {
    render(<GrowthSection overview={withGrowth} />)
    expect(
      screen.getByRole('heading', { name: /projected cost if nothing changes/i }),
    ).toBeInTheDocument()
  })

  it('reports the mini-stats the model measured', () => {
    render(<GrowthSection overview={withGrowth} />)
    expect(screen.getByText('Added last 6 mo').nextElementSibling).toHaveTextContent('50 GB')
    expect(screen.getByText('Drives near cap').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Used today').nextElementSibling).toHaveTextContent('500 GB')
    expect(screen.getByText('Forecast (6 mo)').nextElementSibling).toHaveTextContent('560 GB')
    expect(screen.getByText('Over entitlement today').nextElementSibling).toHaveTextContent('0 B')
  })
})
