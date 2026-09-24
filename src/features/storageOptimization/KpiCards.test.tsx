import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { base, unknownEntitlement, usageUnreported } from './testFixtures'
import type { StorageOverview } from '@/types/storage'
import { KpiCards } from './KpiCards'
import { P365 } from '@/design/theme'

afterEach(cleanup)

function railOf(label: string): string {
  const card = screen.getByText(label).parentElement as HTMLElement
  return card.style.borderLeftColor
}

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

describe('KpiCards', () => {
  it('rails the forecast card red on a critical forecast and green on a healthy one', () => {
    const critical: StorageOverview = {
      ...base,
      growth: { ...base.growth, forecastStatus: 'Critical' },
    }
    const { unmount } = render(<KpiCards overview={critical} />)
    expect(railOf('Forecast exhaustion')).toBe(rgb(P365.red))
    unmount()

    render(<KpiCards overview={base} />)
    expect(railOf('Forecast exhaustion')).toBe(rgb(P365.green))
  })

  it('greys the remaining and forecast cards, keeps the cost rail, and says Unknown on all three, when the entitlement is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(railOf('Storage used')).toBe(rgb(P365.navy))
    expect(railOf('Remaining')).toBe(rgb(P365.grey400))
    expect(railOf('Cost of doing nothing')).toBe(rgb(P365.yellow))
    expect(railOf('Forecast exhaustion')).toBe(rgb(P365.grey400))
    expect(screen.getAllByText('Unknown')).toHaveLength(3)
  })

  it('rails remaining green and cost yellow on a known entitlement', () => {
    render(<KpiCards overview={base} />)
    expect(railOf('Remaining')).toBe(rgb(P365.green))
    expect(railOf('Cost of doing nothing')).toBe(rgb(P365.yellow))
  })

  it('shows storage used as unknown, not 0 B, when Microsoft 365 returned no storage history', () => {
    render(<KpiCards overview={usageUnreported} />)
    const used = screen.getByText('Storage used').parentElement as HTMLElement
    expect(used).toHaveTextContent('Unknown')
    expect(used).not.toHaveTextContent('0 B')
    expect(used).toHaveTextContent('Microsoft 365 returned no storage history for this tenant')
    expect(railOf('Storage used')).toBe(rgb(P365.grey400))
    const remaining = screen.getByText('Remaining').parentElement as HTMLElement
    expect(remaining).toHaveTextContent('Unknown')
    expect(remaining).toHaveTextContent('Microsoft 365 returned no storage history for this tenant')
    expect(remaining).not.toHaveTextContent('Tenant entitlement unavailable')
  })
})
