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
    expect(screen.getByText(/2026-12-01/)).toBeInTheDocument()
  })

  it('refuses a forecast on short history and says it is not an all-clear', () => {
    render(<GrowthSection overview={{ ...shortHistory, growth: { ...shortHistory.growth, points } }} />)
    expect(screen.getByText(/not an all-clear/i)).toBeInTheDocument()
    expect(screen.queryByText(/2030-01-01/)).not.toBeInTheDocument()
  })

  it('says the tenant is already over its entitlement when runway is zero', () => {
    const over = {
      ...withGrowth,
      growth: {
        ...withGrowth.growth,
        forecastMonthsToExhaustion: 0,
        forecastStatus: 'Critical' as const,
      },
    }
    render(<GrowthSection overview={over} />)
    expect(
      screen.getByText(/already using more than its pooled entitlement/i),
    ).toBeInTheDocument()
  })

  it('qualifies a volatile series rather than hiding the figure', () => {
    const volatile = {
      ...withGrowth,
      growth: { ...withGrowth.growth, seriesIsVolatile: true },
    }
    render(<GrowthSection overview={volatile} />)
    expect(screen.getByText(/treat the projection as indicative/i)).toBeInTheDocument()
    expect(screen.getByText(/Average growth/i)).toBeInTheDocument()
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
    expect(screen.getByText(/notional/i)).toBeInTheDocument()
  })

  it('shows the billable cost when the entitlement is known', () => {
    render(<GrowthSection overview={withGrowth} />)
    expect(
      screen.getByRole('heading', { name: /projected cost if nothing changes/i }),
    ).toBeInTheDocument()
  })

  it('reports the mini-stats the model measured', () => {
    render(<GrowthSection overview={withGrowth} />)
    expect(screen.getByText(/months of history/i)).toBeInTheDocument()
    expect(screen.getByText(/drives near their cap/i)).toBeInTheDocument()
  })
})
