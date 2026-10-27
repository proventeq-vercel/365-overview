import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import { GrowthSection } from './GrowthSection'
import { base, firstDay, unknownEntitlement } from './testFixtures'

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

  it('still draws the after-clean-up line when nothing is removable, on the forecast itself', () => {
    const nothing = {
      ...base,
      growth: {
        ...base.growth,
        afterCleanUp: { ...base.growth.afterCleanUp, inactiveBytes: 0, removableBytes: 0, endBytes: 560 * 1_073_741_824 },
      },
    }
    render(<GrowthSection overview={nothing} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
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
    expect(screen.queryByText('If inactive and deleted sites are cleaned up')).not.toBeInTheDocument()
  })

  it('draws only the measured line when a single day has been reported', () => {
    render(<GrowthSection overview={firstDay} />)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Actual used:actualUsedBytes:solid',
    ])
  })
})
