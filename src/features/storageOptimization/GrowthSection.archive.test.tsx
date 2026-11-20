import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup, fireEvent } from '@testing-library/react'
import { render } from '@/test/render'
import type { StorageRow } from '@/types/storage'
import { GrowthSection } from './GrowthSection'
import { base } from './testFixtures'

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

const site = (id: string, name: string, usedGb: number, lastActivityDate: string): StorageRow => ({
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
})

const withSites = {
  ...base,
  sharePoint: {
    ...base.sharePoint,
    sites: [site('old', 'Old projects', 30, '2021-03-03'), site('team', 'Old team', 10, '2022-01-01'), site('busy', 'Busy', 99, '2026-08-01')],
  },
}

const trendKeys = () =>
  Array.from(screen.getByRole('list', { name: 'Storage trend & forecast' }).querySelectorAll('li')).map(
    (item) => item.textContent,
  )
const row = (label: string) => screen.getByText(label).nextElementSibling

describe('GrowthSection archive pick', () => {
  it('lists only the inactive live sites and adds the archive line for the ones picked', () => {
    render(<GrowthSection overview={withSites} />)
    expect(trendKeys()).not.toContain('afterArchiveBytes')

    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    expect(screen.queryByRole('checkbox', { name: 'Busy' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Old projects' }))
    expect(screen.getByText('1 site · 30 GB')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show the impact' }))

    expect(trendKeys()).toContain('afterArchiveBytes')
    expect(screen.getByText('Archive 1 picked site').nextElementSibling).toHaveTextContent('30 GB')
    expect(row('Total')).toHaveTextContent(/^150 GB$/)
  })

  it('keeps the picks when the picker is cancelled', () => {
    render(<GrowthSection overview={withSites} />)
    fireEvent.click(screen.getByRole('button', { name: /Choose sites/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(trendKeys()).not.toContain('afterArchiveBytes')
    expect(screen.getByText('Archive inactive sites')).toBeInTheDocument()
  })
})
