import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { base, unknownEntitlement } from '@/sections/StorageOptimization/testFixtures'
import type { StorageOverview } from '@/types/storage'
import { ProductKpiCards } from './ProductKpiCards'
import { P365 } from './theme'

afterEach(cleanup)

function railOf(label: string): string {
  const card = screen.getByText(label).parentElement as HTMLElement
  return card.style.borderLeftColor
}

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

describe('ProductKpiCards', () => {
  it('rails the forecast card red on a critical forecast and green on a healthy one', () => {
    const critical: StorageOverview = {
      ...base,
      growth: { ...base.growth, forecastStatus: 'Critical' },
    }
    const { unmount } = render(<ProductKpiCards overview={critical} />)
    expect(railOf('Forecast exhaustion')).toBe(rgb(P365.red))
    unmount()

    render(<ProductKpiCards overview={base} />)
    expect(railOf('Forecast exhaustion')).toBe(rgb(P365.green))
  })

  it('greys the remaining, cost and forecast cards when the entitlement is unknown', () => {
    render(<ProductKpiCards overview={unknownEntitlement} />)
    expect(railOf('Storage used')).toBe(rgb(P365.navy))
    expect(railOf('Remaining')).toBe(rgb(P365.grey400))
    expect(railOf('Cost of doing nothing')).toBe(rgb(P365.grey400))
    expect(railOf('Forecast exhaustion')).toBe(rgb(P365.grey400))
    expect(screen.getAllByText('Unknown')).toHaveLength(3)
  })

  it('rails remaining green and cost yellow on a known entitlement', () => {
    render(<ProductKpiCards overview={base} />)
    expect(railOf('Remaining')).toBe(rgb(P365.green))
    expect(railOf('Cost of doing nothing')).toBe(rgb(P365.yellow))
  })
})
