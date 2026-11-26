import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup, fireEvent, within } from '@testing-library/react'
import { renderWithData } from '@/test/render'
import type { SiteDirectory } from '@/reports/siteDirectory'
import type { GrowthPoint, StorageOverview, StorageRow } from '@/types/storage'
import { GrowthSection } from './GrowthSection'
import { base, overEntitlement } from './testFixtures'

vi.mock('@/design/charts', () => ({
  MonoLineChart: ({ ariaLabel, series }: { ariaLabel: string; series: { key: string; name: string }[] }) => (
    <ul aria-label={ariaLabel}>
      {series.map((s) => (
        <li key={s.key}>{s.key}</li>
      ))}
    </ul>
  ),
}))

afterEach(cleanup)

const GB = 1_073_741_824

const site = (id: string, name: string, usedGb: number, lastActivityDate: string, over: Partial<StorageRow> = {}): StorageRow => ({
  pool: 'SharePoint',
  id,
  name,
  url: `https://contoso.sharepoint.com/sites/${id}`,
  ownerDisplayName: '',
  storageUsedBytes: usedGb * GB,
  fileCount: 0,
  activeFileCount: 0,
  lastActivityDate,
  isDeleted: false,
  ...over,
})

const candidates = [
  site('old', 'Old projects', 30, '2021-03-03'),
  site('team', 'Old team', 10, '2022-01-01', { template: 'Group' }),
]

const withSites: StorageOverview = { ...base, archive: { ...base.archive, sites: candidates } }

const trendKeys = () =>
  Array.from(screen.getByRole('list', { name: 'Storage trend & forecast' }).querySelectorAll('li')).map(
    (item) => item.textContent,
  )
const row = (label: string) => screen.getByText(label).nextElementSibling
const dialog = () => screen.getByRole('dialog', { name: 'Choose sites to archive' })

describe('GrowthSection archive pick', () => {
  it('lists the archivable sites and adds the archive line for the ones picked', () => {
    renderWithData(<GrowthSection overview={withSites} />)
    expect(trendKeys()).not.toContain('afterArchiveBytes')

    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    expect(screen.getByText('Live sites with no activity since 30 Aug 2023, largest first')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Old projects, 30 GB, last activity 3 Mar 2021' }))
    expect(screen.getByText('1 site · 30 GB')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show the impact' }))

    expect(trendKeys()).toContain('afterArchiveBytes')
    expect(screen.getByText('Archive 1 picked site').nextElementSibling).toHaveTextContent('30 GB')
    expect(row('Total')).toHaveTextContent(/^150 GB$/)
    expect(screen.getByRole('button', { name: 'Change sites' })).toBeInTheDocument()
  })

  it('names the service next to the last activity of each site', () => {
    renderWithData(<GrowthSection overview={withSites} />)
    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    expect(within(dialog()).getByText('SharePoint · Last activity 3 Mar 2021')).toBeInTheDocument()
    expect(within(dialog()).getByText('Teams · Last activity 1 Jan 2022')).toBeInTheDocument()
  })

  it('selects every candidate with Select all', () => {
    renderWithData(<GrowthSection overview={withSites} />)
    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(screen.getByText('2 sites · 40 GB')).toBeInTheDocument()
  })

  it('keeps the earlier pick when a later change is cancelled', () => {
    renderWithData(<GrowthSection overview={withSites} />)
    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^Old projects/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Show the impact' }))
    expect(row('Total')).toHaveTextContent(/^150 GB$/)

    fireEvent.click(screen.getByRole('button', { name: 'Change sites' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(trendKeys()).toContain('afterArchiveBytes')
    expect(screen.getByText('Archive 1 picked site').nextElementSibling).toHaveTextContent('30 GB')
    expect(row('Total')).toHaveTextContent(/^150 GB$/)
  })

  it('shows no real name in the picker while names are masked', () => {
    renderWithData(
      <GrowthSection overview={{ ...withSites, caveats: { ...withSites.caveats, nameMask: 'hidden' } }} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    expect(within(dialog()).queryByText('Old projects')).not.toBeInTheDocument()
    expect(within(dialog()).getAllByRole('button', { name: 'Hidden name' })).toHaveLength(2)
    expect(
      within(dialog()).getByRole('checkbox', { name: 'Hidden name, 30 GB, last activity 3 Mar 2021' }),
    ).toBeInTheDocument()
  })

  it('pages the candidates so a tenant with thousands of inactive sites renders one page', () => {
    const many = Array.from({ length: 120 }, (_, i) => site(`s${i}`, `Site ${i}`, 1, '2021-03-03'))
    renderWithData(<GrowthSection overview={{ ...base, archive: { ...base.archive, sites: many } }} />)
    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    expect(within(dialog()).getAllByRole('checkbox')).toHaveLength(51)
    expect(within(dialog()).getByText('1–50 of 120')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(screen.getByText('120 sites · 120 GB')).toBeInTheDocument()
  })

  it('counts a pick even when no deleted site is still billing', () => {
    const noDeleted = {
      ...withSites,
      growth: {
        ...withSites.growth,
        afterCleanUp: { ...withSites.growth.afterCleanUp, deletedBytes: 0, removableBytes: 0, endBytes: 560 * GB },
      },
    }
    renderWithData(<GrowthSection overview={noDeleted} />)
    expect(screen.getByText(/^No deleted site is still billing\./)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^Old projects/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Show the impact' }))
    expect(row('Total')).toHaveTextContent(/^30 GB$/)
    expect(screen.getByText('SharePoint storage only. Archiving counts only the sites you pick.')).toBeInTheDocument()
    expect(screen.queryByText(/^No deleted site is still billing\./)).not.toBeInTheDocument()
  })

  it('adds the spend after archiving to the cost chart when the forecast is billable', () => {
    const points: GrowthPoint[] = [
      { month: '2026-07', actualUsedBytes: 1100 * GB, projectedUsedBytes: 1100 * GB, afterCleanUpBytes: 980 * GB },
      { month: '2026-08', actualUsedBytes: null, projectedUsedBytes: 1110 * GB, afterCleanUpBytes: 990 * GB },
    ]
    const billable = {
      ...overEntitlement,
      growth: { ...overEntitlement.growth, points },
      archive: { ...overEntitlement.archive, sites: candidates },
    }
    renderWithData(<GrowthSection overview={billable} />)
    const costKeys = () =>
      Array.from(screen.getByRole('list', { name: 'Projected cost if nothing changes' }).querySelectorAll('li')).map(
        (item) => item.textContent,
      )
    expect(costKeys()).toEqual(['forecastCost', 'afterCleanUpCost'])
    expect(row('Forecast after clean-up (6 mo)')).toHaveTextContent(/^440 GB$/)

    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^Old projects/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Show the impact' }))
    expect(costKeys()).toEqual(['forecastCost', 'afterCleanUpCost', 'afterArchiveCost'])
    expect(row('Forecast after clean-up and archiving (6 mo)')).toHaveTextContent(/^960 GB$/)
  })

  describe('site names', () => {
    const blank = site('8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718', '', 30, '2021-03-03', { name: undefined, url: '' })
    const unnamed: StorageOverview = { ...base, archive: { ...base.archive, sites: [blank] } }

    it('looks up the name of a site the usage report left blank, showing a skeleton meanwhile', async () => {
      const getSiteDetails = vi.fn(
        async (): Promise<SiteDirectory> =>
          new Map([[blank.id, { name: 'Finance', url: 'https://contoso.sharepoint.com/sites/finance' }]]),
      )
      renderWithData(<GrowthSection overview={unnamed} />, { getSiteDetails })
      fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))

      expect(within(dialog()).getByLabelText('Looking up the site name')).toBeInTheDocument()
      expect(await within(dialog()).findByText('Finance')).toBeInTheDocument()
      expect(getSiteDetails).toHaveBeenCalledWith([blank.id])
      expect(within(dialog()).getByRole('checkbox', { name: 'Finance, 30 GB, last activity 3 Mar 2021' })).toBeInTheDocument()
    })

    it('looks up no name while names are masked', () => {
      const getSiteDetails = vi.fn(async (): Promise<SiteDirectory> => new Map())
      renderWithData(
        <GrowthSection overview={{ ...unnamed, caveats: { ...unnamed.caveats, nameMask: 'concealed' } }} />,
        { getSiteDetails },
      )
      fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
      expect(getSiteDetails).not.toHaveBeenCalled()
    })
  })
})
