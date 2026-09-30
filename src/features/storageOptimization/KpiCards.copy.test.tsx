import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import { KpiCards } from './KpiCards'
import { base, shortHistory, unknownEntitlement } from './testFixtures'
import type { StorageOverview } from '@/types/storage'

afterEach(cleanup)

const card = (label: string) => screen.getByText(label).closest('[data-slot="stat-card"]')!

const ARCHIVE = 'Inactive sites to archive'
const SAVING = 'Potential saving per year'
const COST = 'Cost of doing nothing, next 12 months'
const FORECAST = 'Forecast exhaustion'

const nothingToArchive: StorageOverview = {
  ...base,
  archive: { ...base.archive, siteCount: 0, bytes: 0, shareOfSharePoint: 0, status: 'healthy', annualSaving: 0 },
}

describe('KpiCards', () => {
  it('sits under its own section heading', () => {
    render(<KpiCards overview={base} />)
    expect(screen.getByRole('heading', { name: 'Tenant capacity' })).toBeInTheDocument()
  })

  it('shows the archivable storage as a size, with the share and the sites in the description', () => {
    render(<KpiCards overview={base} />)
    expect(card(ARCHIVE)).toHaveTextContent('120 GB')
    expect(card(ARCHIVE)).toHaveTextContent(
      '24.0% of SharePoint storage, in 42 sites with no activity for 3 years (since August 2023).',
    )
  })

  it('names a single site and a single year without a plural', () => {
    render(
      <KpiCards
        overview={{ ...base, archive: { ...base.archive, siteCount: 1, inactiveYears: 1 } }}
      />,
    )
    expect(card(ARCHIVE)).toHaveTextContent('in 1 site with no activity for 1 year')
  })

  it('says no site has gone the window without activity when nothing is archivable', () => {
    render(<KpiCards overview={nothingToArchive} />)
    expect(card(ARCHIVE)).toHaveTextContent('0 B')
    expect(card(ARCHIVE)).toHaveTextContent('No site has gone 3 years without activity (since August 2023).')
  })

  it('shows the yearly saving as money, with the storage and rate behind it', () => {
    render(<KpiCards overview={base} />)
    expect(card(SAVING)).toHaveTextContent('£28.80')
    expect(card(SAVING)).toHaveTextContent(
      'Storage cost avoided if the 120 GB of inactive sites is archived, valued at £0.02/GB per month.',
    )
  })

  it('points at the inactivity setting when there is nothing to save', () => {
    render(<KpiCards overview={nothingToArchive} />)
    expect(card(SAVING)).toHaveTextContent('£0.00')
    expect(card(SAVING)).toHaveTextContent('inactivity threshold in Report settings')
  })

  it('prices growth as money even when the entitlement is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card(COST)).toHaveTextContent('£288.00')
    expect(card(COST)).not.toHaveTextContent(/unknown/i)
  })

  it('shows the cost of the next 12 months of growth as money, at the configured rate', () => {
    render(<KpiCards overview={{ ...base, cost: { ...base.cost, growthAnnual: 1234.5 } }} />)
    expect(card(COST)).toHaveTextContent('£1,234.50')
    expect(card(COST)).toHaveTextContent('over the next 12 months')
    expect(card(COST)).toHaveTextContent('£0.02/GB per month')
  })

  it('does not present a forecast when history is too short, and says that is no all-clear', () => {
    render(<KpiCards overview={shortHistory} />)
    expect(card(FORECAST)).toHaveTextContent(/not enough history/i)
    expect(card(FORECAST)).toHaveTextContent('A forecast needs 6 months of measured storage history.')
    expect(card(FORECAST)).toHaveTextContent('not an all-clear')
  })

  it('explains the exhaustion month by the entitlement, the growth rate and the headroom left', () => {
    render(<KpiCards overview={base} />)
    expect(card(FORECAST)).toHaveTextContent('January 2030')
    expect(card(FORECAST)).toHaveTextContent(
      'The month SharePoint storage passes your 1000 GB entitlement if it keeps growing 10 GB a month. 500 GB of headroom is left.',
    )
  })

  it('explains a forecast beyond the horizon by the growth rate and the headroom', () => {
    render(
      <KpiCards
        overview={{
          ...base,
          growth: { ...base.growth, forecastExhaustionDate: null, forecastMonthsToExhaustion: 130 },
        }}
      />,
    )
    expect(card(FORECAST)).toHaveTextContent('Beyond 10 years')
    expect(card(FORECAST)).toHaveTextContent(
      'At 10 GB a month, the 500 GB of headroom left under your 1000 GB entitlement lasts more than 10 years.',
    )
  })

  it('explains no forecast for a tenant that is not growing', () => {
    render(
      <KpiCards
        overview={{
          ...base,
          growth: { ...base.growth, forecastExhaustionDate: null, forecastMonthsToExhaustion: null },
        }}
      />,
    )
    expect(card(FORECAST)).toHaveTextContent('No growth detected')
    expect(card(FORECAST)).toHaveTextContent('has not grown over the last 5 months')
  })

  it('says the forecast needs the entitlement, and where to enter it, when it is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card(FORECAST)).toHaveTextContent('Unknown')
    expect(card(FORECAST)).toHaveTextContent('Enter it in Report settings')
  })

  it('renders exactly four cards', () => {
    const { container } = render(<KpiCards overview={base} />)
    expect(container.querySelectorAll('[data-slot="stat-card"]')).toHaveLength(4)
  })
})
