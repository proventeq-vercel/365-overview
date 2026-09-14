import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import userEvent from '@testing-library/user-event'
import type { StorageRow } from '@/types/storage'
import { SiteTable } from './SiteTable'

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

  it('names a URL-less site by its owner and shows the site id underneath', () => {
    const blank: StorageRow = { ...rows[0], id: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718', url: '' }
    render(<SiteTable rows={[blank]} totalUsedBytes={300} columns={['name']} />)
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent('Ada')
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
