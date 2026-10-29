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

  it('shows the archivable storage as a size, with the sites, the share and the cutoff day in the description', () => {
    render(<KpiCards overview={base} />)
    expect(card(ARCHIVE)).toHaveTextContent('120 GB')
    expect(card(ARCHIVE)).toHaveTextContent('42 sites · 24.0% of live site storage · no activity since 30 Aug 2023')
  })

  it('names a single site without a plural', () => {
    render(<KpiCards overview={{ ...base, archive: { ...base.archive, siteCount: 1 } }} />)
    expect(card(ARCHIVE)).toHaveTextContent(/^120 GBInactive sites to archive1 site · /)
  })

  it('shows a share too small to round as under 0.1%, never as 0.0%', () => {
    render(<KpiCards overview={{ ...base, archive: { ...base.archive, shareOfSharePoint: 0.0002 } }} />)
    expect(card(ARCHIVE)).toHaveTextContent('42 sites · <0.1% of live site storage · ')
  })

  it('groups a large site count', () => {
    render(<KpiCards overview={{ ...base, archive: { ...base.archive, siteCount: 12345 } }} />)
    expect(card(ARCHIVE)).toHaveTextContent('12,345 sites · ')
  })

  it('says no live site has been inactive for the window when nothing is archivable', () => {
    render(<KpiCards overview={nothingToArchive} />)
    expect(card(ARCHIVE)).toHaveTextContent('0 B')
    expect(card(ARCHIVE)).toHaveTextContent('No live site with recorded activity has been inactive for 3 years')
  })

  it('names a single year without a plural when nothing is archivable', () => {
    render(<KpiCards overview={{ ...nothingToArchive, archive: { ...nothingToArchive.archive, inactiveYears: 1 } }} />)
    expect(card(ARCHIVE)).toHaveTextContent(/has been inactive for 1 year$/)
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

  it('says the exhaustion month holds at current growth', () => {
    render(<KpiCards overview={base} />)
    expect(card(FORECAST)).toHaveTextContent(/^January 2030Forecast exhaustionAt current growth$/)
  })

  it('says a forecast beyond the horizon holds at current growth', () => {
    render(
      <KpiCards
        overview={{
          ...base,
          growth: { ...base.growth, forecastExhaustionDate: null, forecastMonthsToExhaustion: 130 },
        }}
      />,
    )
    expect(card(FORECAST)).toHaveTextContent(/^Beyond 10 yearsForecast exhaustionAt current growth$/)
  })

  it('says no growth is detected at current growth for a tenant that is not growing', () => {
    render(
      <KpiCards
        overview={{
          ...base,
          growth: { ...base.growth, forecastExhaustionDate: null, forecastMonthsToExhaustion: null },
        }}
      />,
    )
    expect(card(FORECAST)).toHaveTextContent(/^No growth detectedForecast exhaustionAt current growth$/)
  })

  it('shows the monthly growth in place of a runway, and says it needs the entitlement, when it is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card(GROWTH)).toHaveTextContent(/^\+10 GBSharePoint growth per monthNeeds tenant entitlement · growth over the last 5 months$/)
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
