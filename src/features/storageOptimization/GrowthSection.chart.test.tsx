import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import { GrowthSection } from './GrowthSection'
import { base, shortHistory, unknownEntitlement } from './testFixtures'

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

  it('draws no after-clean-up line when nothing is removable', () => {
    const nothing = {
      ...base,
      growth: {
        ...base.growth,
        afterCleanUp: {
          ...base.growth.afterCleanUp,
          inactiveBytes: 0,
          removableBytes: 0,
          endBytes: null,
          staysUnderEntitlement: null,
          unavailableReason: 'nothingRemovable' as const,
        },
      },
    }
    render(<GrowthSection overview={nothing} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText(/Forecast after clean-up:/)).not.toBeInTheDocument()
  })

  it('draws no after-clean-up line when the history is too short to forecast', () => {
    render(<GrowthSection overview={shortHistory} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
