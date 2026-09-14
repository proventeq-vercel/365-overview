import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { GrowthSection } from './GrowthSection'
import { base, unknownEntitlement } from './testFixtures'

vi.mock('@/design/charts', () => ({
  MonoLineChart: ({
    ariaLabel,
    referenceLine,
  }: {
    ariaLabel: string
    referenceLine?: { value: number; label: string }
  }) => (
    <div role="img" aria-label={ariaLabel}>
      {referenceLine && <span data-testid="reference-line">{`${referenceLine.label}=${referenceLine.value}`}</span>}
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
})
