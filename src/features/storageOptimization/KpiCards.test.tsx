import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { render } from '@/test/render'
import { base, dailyRate, overEntitlement, unknownEntitlement } from './testFixtures'
import type { StorageOverview } from '@/types/storage'
import { KpiCards } from './KpiCards'
import { P365 } from '@/design/theme'

afterEach(cleanup)

const GB = 1_073_741_824

const USED = 'SharePoint storage used'
const OVER = 'Over entitlement'
const FORECAST = 'Forecast exhaustion'
const COST = 'Cost of doing nothing, next 3 years'
const ARCHIVE = 'Inactive sites to archive'
const DELETED = 'Deleted but still billing'
const DELETED_COUNTING = 'Deleted but still counting'

const card = (label: string) => screen.getByText(label).closest('[data-slot="stat-card"]') as HTMLElement

const labels = () =>
  screen
    .getAllByText(/./, { selector: '[data-slot="stat-card"] > p:nth-child(2)' })
    .map((label) => label.textContent)

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

const quiet: StorageOverview = {
  ...base,
  growth: { ...base.growth, forecastExhaustionDate: null, forecastMonthsToExhaustion: null },
  archive: { ...base.archive, siteCount: 0, bytes: 0 },
  cost: { ...base.cost, cumulativeYear3: 0 },
}

const soon: StorageOverview = {
  ...base,
  growth: { ...base.growth, forecastStatus: 'Critical', forecastMonthsToExhaustion: 10 },
}

const busy: StorageOverview = {
  ...overEntitlement,
  sharePoint: { ...overEntitlement.sharePoint, deletedButBilling: { bytes: 24 * GB, count: 4 } },
  cost: { ...overEntitlement.cost, applies: true, cumulativeYear3: 1296 },
}

describe('KpiCards', () => {
  it('names the cards as tenant capacity, with a visible group label and no heading', () => {
    render(<KpiCards overview={quiet} />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tenant capacity' })).toHaveTextContent(/^Tenant capacity/)
  })

  it('shows only the storage used, against the entitlement, for a quiet tenant', () => {
    render(<KpiCards overview={quiet} />)
    expect(labels()).toEqual([USED])
    expect(card(USED)).toHaveTextContent('500 GB of 1000 GB entitlement')
  })

  it('says the entitlement is unknown on the storage used card, with a way to enter it', () => {
    render(<KpiCards overview={{ ...unknownEntitlement, cost: { ...unknownEntitlement.cost, applies: false } }} />)
    expect(card(USED)).toHaveTextContent('No entitlement entered · Enter it in Report settings')
    expect(within(card(USED)).getByRole('button', { name: 'Enter it in Report settings' })).toBeInTheDocument()
  })

  it('puts the amount over the entitlement on the storage used card, in red', () => {
    render(<KpiCards overview={busy} />)
    expect(card(USED)).toHaveTextContent('1.1 TB of 1000 GB entitlement · 100 GB over')
    expect(within(card(USED)).getByText('100 GB over').style.color).toBe(rgb(P365.red))
  })

  it('says when the entitlement is estimated from licences', () => {
    render(<KpiCards overview={{ ...quiet, caveats: { ...quiet.caveats, entitlementIsEstimated: true } }} />)
    expect(card(USED)).toHaveTextContent('500 GB of 1000 GB entitlement · entitlement estimated from licences')
  })

  it('shows every card a busy tenant can act on', () => {
    render(<KpiCards overview={busy} />)
    expect(labels()).toEqual([USED, OVER, COST, ARCHIVE, DELETED])
    expect(card(OVER)).toHaveTextContent('100 GB')
    expect(card(COST)).toHaveTextContent('£1,296.00')
    expect(card(DELETED)).toHaveTextContent(
      '24 GBDeleted but still billing4 deleted sites in the recycle bin or under retention · 24 GB of it is past your entitlement and billed · £5.76/yr until purged',
    )
    expect(card(DELETED).style.borderLeftColor).toBe(rgb(P365.orange))
  })

  it('says deleted storage under the entitlement counts but is not billed today', () => {
    render(
      <KpiCards
        overview={{ ...quiet, sharePoint: { ...quiet.sharePoint, deletedButBilling: { bytes: 24 * GB, count: 4 } } }}
      />,
    )
    expect(labels()).toEqual([USED, DELETED_COUNTING])
    expect(card(DELETED_COUNTING)).toHaveTextContent(
      'Counts toward your storage, not billed today: you are under your entitlement by 500 GB',
    )
    expect(card(DELETED_COUNTING).style.borderLeftColor).toBe(rgb(P365.grey500))
  })

  it('rails the over-entitlement card red', () => {
    render(<KpiCards overview={busy} />)
    expect(card(OVER).style.borderLeftColor).toBe(rgb(P365.red))
  })

  it('shows the forecast inside the 24-month window, railed by its grade', () => {
    render(<KpiCards overview={soon} />)
    expect(card(FORECAST)).toHaveTextContent(/^January 2030Forecast exhaustionAt current growth$/)
    expect(card(FORECAST).style.borderLeftColor).toBe(rgb(P365.red))
  })

  it('names the days a short-history forecast was measured over', () => {
    render(
      <KpiCards
        overview={{ ...dailyRate, growth: { ...dailyRate.growth, forecastMonthsToExhaustion: 10 } }}
      />,
    )
    expect(card(FORECAST)).toHaveTextContent('Forecast from the last 40 days of storage')
  })

  it('shows the archivable storage with the sites, the share and the cutoff day', () => {
    render(<KpiCards overview={base} />)
    expect(card(ARCHIVE)).toHaveTextContent('120 GB')
    expect(card(ARCHIVE)).toHaveTextContent('42 sites · 24.0% of live site storage · no activity since 30 Aug 2023')
  })

  it('says how long inactive means on the archive card, with a way to change it', () => {
    render(<KpiCards overview={base} />)
    expect(card(ARCHIVE)).toHaveTextContent('Inactive means no activity for 3 years. Change it in Report settings')
    expect(within(card(ARCHIVE)).getByRole('button', { name: 'Change it in Report settings' })).toBeInTheDocument()
  })

  it('names a single site without a plural, and a share too small to round as under 0.1%', () => {
    render(<KpiCards overview={{ ...base, archive: { ...base.archive, siteCount: 1, shareOfSharePoint: 0.0002 } }} />)
    expect(card(ARCHIVE)).toHaveTextContent('1 site · <0.1% of live site storage · ')
  })

  it('adds the yearly saving to the archive card when archiving cuts the bill', () => {
    render(<KpiCards overview={overEntitlement} />)
    expect(card(ARCHIVE)).toHaveTextContent(/ · archiving saves £24\.00\/yr\s*Inactive means/)
  })

  it('fills the row with however many cards it shows', () => {
    render(<KpiCards overview={busy} />)
    expect(card(USED).parentElement).toHaveClass('xl:grid-cols-5')
  })
})
