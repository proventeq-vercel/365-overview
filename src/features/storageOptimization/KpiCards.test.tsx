import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { base, unknownEntitlement } from './testFixtures'
import type { StorageOverview } from '@/types/storage'
import { KpiCards } from './KpiCards'
import { P365 } from '@/design/theme'

afterEach(cleanup)

function railOf(label: string): string {
  const card = screen.getByText(label).closest('[data-slot="stat-card"]') as HTMLElement
  return card.style.borderLeftColor
}

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

const ARCHIVE = 'Inactive sites to archive'
const SAVING = 'Potential saving per year'
const COST = 'Cost of doing nothing, next 12 months'
const FORECAST = 'Forecast exhaustion'

const withArchive = (status: StorageOverview['archive']['status']): StorageOverview => ({
  ...base,
  archive: { ...base.archive, status },
})

const withCost = (growthAnnualStatus: StorageOverview['cost']['growthAnnualStatus']): StorageOverview => ({
  ...base,
  cost: { ...base.cost, growthAnnualStatus },
})

describe('KpiCards', () => {
  it('rails the forecast card red on a critical forecast and green on a healthy one', () => {
    const critical: StorageOverview = {
      ...base,
      growth: { ...base.growth, forecastStatus: 'Critical' },
    }
    const { unmount } = render(<KpiCards overview={critical} />)
    expect(railOf(FORECAST)).toBe(rgb(P365.red))
    unmount()

    render(<KpiCards overview={base} />)
    expect(railOf(FORECAST)).toBe(rgb(P365.green))
  })

  it('greys the forecast card, but not the cost, when the entitlement is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(railOf(COST)).toBe(rgb(P365.orange))
    expect(railOf(FORECAST)).toBe(rgb(P365.grey400))
  })

  it.each([
    ['healthy', P365.green],
    ['watch', P365.orange],
    ['attention', P365.red],
  ] as const)('rails the archive and saving cards by a %s archive grade', (status, color) => {
    render(<KpiCards overview={withArchive(status)} />)
    expect(railOf(ARCHIVE)).toBe(rgb(color))
    expect(railOf(SAVING)).toBe(rgb(color))
  })

  it.each([
    ['healthy', P365.green],
    ['watch', P365.orange],
    ['attention', P365.red],
  ] as const)('rails the cost card by a %s cost grade', (status, color) => {
    render(<KpiCards overview={withCost(status)} />)
    expect(railOf(COST)).toBe(rgb(color))
  })
})
