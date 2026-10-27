import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import { KpiCards } from './KpiCards'
import { base, dailyRate, firstDay, overEntitlement, unknownEntitlement } from './testFixtures'
import type { StorageOverview } from '@/types/storage'

afterEach(cleanup)

const card = (label: string) => screen.getByText(label).closest('[data-slot="stat-card"]')!

const ARCHIVE = 'Inactive sites to archive'
const SAVING = 'Potential saving per year'
const COST = 'Cost of doing nothing, next 12 months'
const FORECAST = 'Forecast exhaustion'
const GROWTH = 'SharePoint growth per month'
const USED = 'SharePoint storage used'

const nothingToArchive: StorageOverview = {
  ...unknownEntitlement,
  archive: {
    ...unknownEntitlement.archive,
    siteCount: 0,
    bytes: 0,
    shareOfSharePoint: 0,
    status: 'healthy',
    savingBytes: 0,
    annualSaving: 0,
  },
}

const labels = () =>
  screen
    .getAllByText(/./, { selector: '[data-slot="stat-card"] > p:nth-child(2)' })
    .map((label) => label.textContent)

describe('KpiCards', () => {
  it('has no heading of its own, only a name for assistive technology', () => {
    render(<KpiCards overview={base} />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tenant capacity' })).toBeInTheDocument()
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

  it('shows the yearly saving as money, with the storage and rate behind it, when the entitlement is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card(SAVING)).toHaveTextContent('£28.80')
    expect(card(SAVING)).toHaveTextContent(
      'Storage cost avoided if the 120 GB of inactive sites is archived, valued at £0.02/GB per month.',
    )
  })

  it('prices only the archivable storage over the entitlement, and says how much of the overage it clears', () => {
    render(<KpiCards overview={overEntitlement} />)
    expect(card(SAVING)).toHaveTextContent('£24.00')
    expect(card(SAVING)).toHaveTextContent(
      'Spend avoided by archiving inactive sites: 100 GB of the 100 GB over your entitlement, valued at £0.02/GB per month.',
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

  it('forecasts from the daily series on a short history, and says over how many days', () => {
    render(<KpiCards overview={dailyRate} />)
    expect(card(FORECAST)).toHaveTextContent('January 2030')
    expect(card(FORECAST)).toHaveTextContent('Forecast from the last 40 days of storage')
    expect(card(COST)).toHaveTextContent('Forecast from the last 40 days of storage')
  })

  it('shows the storage used, with no forecast, when only one day has been reported', () => {
    render(<KpiCards overview={firstDay} />)
    expect(labels()).toEqual([ARCHIVE, USED])
    expect(card(USED)).toHaveTextContent('500 GB')
    expect(card(USED)).toHaveTextContent('The forecast starts from the second day it reports.')
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

  it('shows the monthly growth in place of a runway, and where to enter the entitlement, when it is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card(GROWTH)).toHaveTextContent('+10 GB')
    expect(card(GROWTH)).not.toHaveTextContent(/unknown/i)
    expect(card(GROWTH)).toHaveTextContent('Enter the tenant entitlement in Options, Report settings')
  })

  it('leaves the saving out while storage is within the entitlement, where archiving saves nothing', () => {
    render(<KpiCards overview={base} />)
    expect(labels()).toEqual([ARCHIVE, COST, FORECAST])
  })

  it('leaves the forecast out once the entitlement is exceeded, and shows the saving', () => {
    render(<KpiCards overview={overEntitlement} />)
    expect(labels()).toEqual([ARCHIVE, SAVING, COST])
  })

  it('shows all four cards when the entitlement is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(labels()).toEqual([ARCHIVE, SAVING, COST, GROWTH])
  })

  it('fills the row with however many cards it shows', () => {
    const { unmount } = render(<KpiCards overview={base} />)
    expect(screen.getByRole('region')).toHaveClass('xl:grid-cols-3')
    unmount()
    render(<KpiCards overview={unknownEntitlement} />)
    expect(screen.getByRole('region')).toHaveClass('xl:grid-cols-4')
  })
})
