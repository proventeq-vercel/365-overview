import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { NO_SITE_DETAILS, renderWithData } from '@/test/render'
import userEvent from '@testing-library/user-event'
import type { StorageRow } from '@/types/storage'
import type { DataSource } from '@/data/fixtures'
import type { SiteDirectory } from '@/reports/siteDirectory'
import { SiteTable } from './SiteTable'

const render = (ui: ReactNode, getSiteDetails: DataSource['getSiteDetails'] = NO_SITE_DETAILS) =>
  renderWithData(ui, { getSiteDetails })

const rows: StorageRow[] = [
  {
    pool: 'SharePoint',
    id: 'a',
    url: 'https://c.sharepoint.com/sites/alpha',
    ownerDisplayName: 'Ada',
    storageUsedBytes: 300,
    fileCount: 30,
    activeFileCount: 3,
    lastActivityDate: '2026-01-01',
    isDeleted: false,
    template: 'STS#3',
  },
  {
    pool: 'SharePoint',
    id: 'b',
    url: 'https://c.sharepoint.com/sites/beta',
    ownerDisplayName: 'Grace',
    storageUsedBytes: 700,
    fileCount: 70,
    activeFileCount: 7,
    lastActivityDate: '2026-08-01',
    isDeleted: false,
    template: 'TEAMCHANNEL#0',
  },
]

const drive: StorageRow = {
  pool: 'OneDrive',
  id: 'd',
  url: 'https://c-my.sharepoint.com/personal/d',
  ownerDisplayName: 'Drive Owner',
  storageUsedBytes: 500,
  fileCount: 5,
  activeFileCount: 1,
  lastActivityDate: null,
  isDeleted: false,
  allocatedBytes: 1000,
}

afterEach(cleanup)

describe('SiteTable', () => {
  it('renders only the requested columns', () => {
    render(<SiteTable rows={rows} totalUsedBytes={1000} columns={['name', 'used']} />)
    expect(screen.getByRole('columnheader', { name: /site/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /owner/i })).not.toBeInTheDocument()
  })

  it('renders the last-activity column when asked', () => {
    render(<SiteTable rows={rows} totalUsedBytes={1000} columns={['name', 'lastActivity']} />)
    expect(screen.getByRole('columnheader', { name: /last activity/i })).toBeInTheDocument()
    expect(screen.getByText('2026-08-01')).toBeInTheDocument()
  })

  it('renders the template column when asked', () => {
    render(<SiteTable rows={rows} totalUsedBytes={1000} columns={['name', 'template']} />)
    expect(screen.getByText('TEAMCHANNEL#0')).toBeInTheDocument()
  })

  it('sorts by storage used descending by default', () => {
    render(<SiteTable rows={rows} totalUsedBytes={1000} columns={['name', 'used']} />)
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent('beta')
  })

  it('sorts by last activity, putting a never-active row last', async () => {
    const user = userEvent.setup()
    render(
      <SiteTable
        rows={[...rows, drive]}
        totalUsedBytes={1500}
        columns={['name', 'lastActivity']}
      />,
    )
    await user.click(screen.getByRole('columnheader', { name: /last activity/i }))
    const cells = screen.getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('beta')
    expect(cells.at(-2)).toHaveTextContent('personal/d')
  })

  it('filters on search across url and owner', async () => {
    const user = userEvent.setup()
    render(<SiteTable rows={rows} totalUsedBytes={1000} columns={['name', 'owner']} />)
    await user.type(screen.getByRole('searchbox'), 'Grace')
    expect(screen.getByText('Grace')).toBeInTheDocument()
    expect(screen.queryByText('Ada')).not.toBeInTheDocument()
  })

  it('shows a drive capacity percentage where an allocation exists', () => {
    render(<SiteTable rows={[drive]} totalUsedBytes={500} columns={['name', 'capacity']} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows no capacity figure for a site, whose allocation is the 25 TB maximum', () => {
    render(<SiteTable rows={rows} totalUsedBytes={1000} columns={['name', 'capacity']} />)
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument()
  })

  it('renders both pools in one table without merging their totals', () => {
    render(
      <SiteTable
        rows={[...rows, drive]}
        totalUsedBytes={1500}
        columns={['name', 'share']}
      />,
    )
    expect(screen.getAllByRole('row').length).toBeGreaterThan(3)
  })

  it('shows the resolved display name over a link to the site that opens in a new tab', () => {
    const named: StorageRow = { ...rows[0], name: 'Alpha Finance' }
    render(<SiteTable rows={[named]} totalUsedBytes={300} columns={['name']} />)
    expect(screen.getByTitle('Alpha Finance')).toHaveTextContent('Alpha Finance')
    const link = screen.getByRole('link', { name: '/sites/alpha' })
    expect(link).toHaveAttribute('href', 'https://c.sharepoint.com/sites/alpha')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marks each row with its pool icon', () => {
    render(<SiteTable rows={[rows[0], drive]} totalUsedBytes={800} columns={['name']} />)
    expect(screen.getByRole('img', { name: 'SharePoint' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'OneDrive' })).toBeInTheDocument()
  })

  it('finds a site by its resolved display name', async () => {
    const user = userEvent.setup()
    const named: StorageRow[] = [{ ...rows[0], name: 'Finance' }, rows[1]]
    render(<SiteTable rows={named} totalUsedBytes={1000} columns={['name']} />)
    await user.type(screen.getByRole('searchbox'), 'finan')
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    expect(screen.getByTitle('Finance')).toBeInTheDocument()
  })

  it('looks up the names of the sites on the visible page, showing a skeleton meanwhile', async () => {
    const blank: StorageRow = { ...rows[0], id: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718', url: '' }
    const directory: SiteDirectory = new Map([
      [blank.id, { name: 'Finance', url: 'https://c.sharepoint.com/sites/finance' }],
    ])
    const getSiteDetails = vi.fn(async (ids: string[]) => {
      const found: SiteDirectory = new Map()
      for (const id of ids) if (directory.has(id)) found.set(id, directory.get(id)!)
      return found
    })
    render(<SiteTable rows={[blank, drive]} totalUsedBytes={800} columns={['name']} />, getSiteDetails)

    expect(screen.getByLabelText('Looking up the site name')).toBeInTheDocument()
    expect(await screen.findByTitle('Finance')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '/sites/finance' })).toBeInTheDocument()
    expect(getSiteDetails).toHaveBeenCalledTimes(1)
    expect(getSiteDetails).toHaveBeenCalledWith([blank.id])
  })

  it('finds a site by the name resolved for a page the user has already viewed', async () => {
    const user = userEvent.setup()
    const blank: StorageRow[] = Array.from({ length: 60 }, (_, i) => ({
      ...rows[0],
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      url: '',
      ownerDisplayName: 'Unknown Owner',
      storageUsedBytes: 1000 - i,
    }))
    const onPageTwo = blank[55]
    const getSiteDetails = vi.fn(async (ids: string[]) => {
      const found: SiteDirectory = new Map()
      if (ids.includes(onPageTwo.id)) {
        found.set(onPageTwo.id, { name: 'Payroll', url: 'https://c.sharepoint.com/sites/payroll' })
      }
      return found
    })
    render(<SiteTable rows={blank} totalUsedBytes={1e6} columns={['name']} />, getSiteDetails)

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByTitle('Payroll')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'payroll')
    expect(await screen.findByText('1 of 60')).toBeInTheDocument()
    expect(screen.getByTitle('Payroll')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '/sites/payroll' })).toBeInTheDocument()
  })

  it('does not look up rows that already carry a name', () => {
    const getSiteDetails = vi.fn(async () => new Map())
    render(<SiteTable rows={[{ ...rows[0], name: 'Alpha' }]} totalUsedBytes={300} columns={['name']} />, getSiteDetails)
    expect(getSiteDetails).not.toHaveBeenCalled()
  })

  it('names a URL-less site by its owner and shows the site id underneath', async () => {
    const blank: StorageRow = { ...rows[0], id: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718', url: '' }
    render(<SiteTable rows={[blank]} totalUsedBytes={300} columns={['name']} />)
    expect(await screen.findByTitle('Ada')).toBeInTheDocument()
    expect(screen.getByText('8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718')).toBeInTheDocument()
  })

  it('finds a URL-less site by its id', async () => {
    const user = userEvent.setup()
    const twins: StorageRow[] = [
      { ...rows[0], id: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718', url: '' },
      { ...rows[0], id: 'e5f60718-1234-4f60-a1b2-000000000000', url: '' },
    ]
    render(<SiteTable rows={twins} totalUsedBytes={600} columns={['name']} />)
    await user.type(screen.getByRole('searchbox'), '8f3c1a2b')
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    expect(screen.getByText('8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718')).toBeInTheDocument()
  })

  describe('pagination', () => {
    const many: StorageRow[] = Array.from({ length: 120 }, (_, i) => ({
      ...rows[0],
      id: `gen-${i}`,
      url: `https://c.sharepoint.com/sites/team-${i}`,
      ownerDisplayName: i < 60 ? 'Early Owner' : 'Late Owner',
      storageUsedBytes: 1000 - i,
    }))
    const firstCell = () => screen.getAllByRole('cell')[0]
    const bodyRows = () => screen.getAllByRole('row').length - 1

    it('shows the first fifty rows of a large estate with the range', () => {
      render(<SiteTable rows={many} totalUsedBytes={1e6} columns={['name', 'used']} />)
      expect(bodyRows()).toBe(50)
      expect(firstCell()).toHaveTextContent('team-0')
      expect(screen.getByText('1–50 of 120')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
    })

    it('pages forward, to the end, and back to the start', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} totalUsedBytes={1e6} columns={['name', 'used']} />)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      expect(firstCell()).toHaveTextContent('team-50')
      expect(screen.getByText('51–100 of 120')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Last page' }))
      expect(bodyRows()).toBe(20)
      expect(screen.getByText('101–120 of 120')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'First page' }))
      expect(firstCell()).toHaveTextContent('team-0')
    })

    it('changes the page size and starts again from the first page', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} totalUsedBytes={1e6} columns={['name', 'used']} />)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.click(screen.getByRole('combobox', { name: 'Rows per page' }))
      await user.click(await screen.findByRole('option', { name: '100' }))
      expect(bodyRows()).toBe(100)
      expect(screen.getByText('1–100 of 120')).toBeInTheDocument()
    })

    it('returns to the first page when the search changes', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} totalUsedBytes={1e6} columns={['name', 'owner']} />)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.type(screen.getByRole('searchbox'), 'Early')
      expect(screen.getByText('1–50 of 60')).toBeInTheDocument()
      expect(firstCell()).toHaveTextContent('team-0')
    })

    it('returns to the first page when the sort changes', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} totalUsedBytes={1e6} columns={['name', 'used']} />)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.click(screen.getByRole('columnheader', { name: /storage used/i }))
      expect(screen.getByText('1–50 of 120')).toBeInTheDocument()
      expect(firstCell()).toHaveTextContent('team-119')
    })

    it('says so when nothing matches', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} totalUsedBytes={1e6} columns={['name']} />)
      await user.type(screen.getByRole('searchbox'), 'nobody')
      expect(screen.getByText('No rows')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    })
  })
})
