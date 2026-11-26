import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import { GrowthSection } from './GrowthSection'
import { base, firstDay, overEntitlement, unknownEntitlement } from './testFixtures'

vi.mock('@/design/charts', () => ({
  MonoLineChart: ({
    ariaLabel,
    referenceLine,
    series,
  }: {
    ariaLabel: string
    referenceLine?: { value: number; label: string }
    series: { key: string; name: string; dashed?: boolean; dotted?: boolean }[]
  }) => (
    <div role="img" aria-label={ariaLabel}>
      {referenceLine && <span data-testid="reference-line">{`${referenceLine.label}=${referenceLine.value}`}</span>}
      <ul aria-label="series">
        {series.map((s) => (
          <li key={s.key}>{`${s.name}:${s.key}:${s.dashed ? 'dashed' : s.dotted ? 'dotted' : 'solid'}`}</li>
        ))}
      </ul>
    </div>
  ),
}))

afterEach(cleanup)

describe('GrowthSection trend chart', () => {
  it('draws the entitlement as a reference line at the entitled bytes', () => {
    render(<GrowthSection overview={base} />)
    expect(screen.getByTestId('reference-line')).toHaveTextContent(
      `Entitlement=${1000 * 1_073_741_824}`,
    )
  })

  it('draws no entitlement line when the entitlement is unknown', () => {
    render(<GrowthSection overview={unknownEntitlement} />)
    expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument()
  })

  it('draws the forecast after clean-up as a dotted third line when something is removable', () => {
    render(<GrowthSection overview={base} />)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Actual used:actualUsedBytes:solid',
      'Linear forecast:projectedUsedBytes:dashed',
      'Forecast after clean-up:afterCleanUpBytes:dotted',
    ])
  })

  it('draws no after-clean-up line when nothing is removable, as it would be the forecast itself', () => {
    const nothing = {
      ...base,
      growth: {
        ...base.growth,
        afterCleanUp: { ...base.growth.afterCleanUp, deletedBytes: 0, removableBytes: 0, endBytes: 560 * 1_073_741_824 },
      },
    }
    render(<GrowthSection overview={nothing} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('draws no after-clean-up line when the site usage report did not come back', () => {
    const unread = {
      ...base,
      growth: { ...base.growth, afterCleanUp: { ...base.growth.afterCleanUp, applies: false, endBytes: null } },
    }
    render(<GrowthSection overview={unread} />)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Actual used:actualUsedBytes:solid',
      'Linear forecast:projectedUsedBytes:dashed',
    ])
    expect(screen.queryByText('Removable today')).not.toBeInTheDocument()
  })

  it('draws only the measured line when a single day has been reported', () => {
    render(<GrowthSection overview={firstDay} />)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Actual used:actualUsedBytes:solid',
    ])
  })

  describe('cost chart', () => {
    const GB = 1_073_741_824
    const costPoints = [
      { month: '2026-07', actualUsedBytes: 1100 * GB, projectedUsedBytes: 1100 * GB, afterCleanUpBytes: 980 * GB },
      { month: '2026-08', actualUsedBytes: null, projectedUsedBytes: 1110 * GB, afterCleanUpBytes: 990 * GB },
    ]
    const costChart = (name: string) => screen.getByRole('img', { name })
    const seriesOf = (name: string) =>
      Array.from(costChart(name).querySelectorAll('li')).map((item) => item.textContent)

    it('titles and names the billable spend when the tenant is over its entitlement', () => {
      render(<GrowthSection overview={{ ...overEntitlement, growth: { ...overEntitlement.growth, points: costPoints } }} />)
      expect(screen.getByRole('heading', { name: 'Projected cost if nothing changes' })).toBeInTheDocument()
      expect(seriesOf('Projected cost if nothing changes')).toEqual([
        'Monthly spend above the entitlement:forecastCost:solid',
        'Spend after clean-up:afterCleanUpCost:dotted',
      ])
      expect(
        screen.getByText('Extra spend once storage grows past the entitlement, at the configured rate.'),
      ).toBeInTheDocument()
    })

    it('titles the chart the value of growth, with its own copy, when the entitlement is unknown', () => {
      render(
        <GrowthSection overview={{ ...unknownEntitlement, growth: { ...unknownEntitlement.growth, points: costPoints } }} />,
      )
      expect(screen.getByRole('heading', { name: 'Projected value of growth' })).toBeInTheDocument()
      expect(seriesOf('Projected value of growth')).toEqual(['Value of the storage added:forecastCost:solid'])
      expect(
        screen.getByText(
          'Enter the tenant entitlement in Options, Report settings to see billable spend. The chart is the list-price value of the storage added.',
        ),
      ).toBeInTheDocument()
    })
  })
})
