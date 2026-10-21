import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup, within } from '@testing-library/react'
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
    render(<SiteTable rows={rows} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'used']} />)
    expect(screen.getByRole('columnheader', { name: /site/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /owner/i })).not.toBeInTheDocument()
  })

  describe('column help', () => {
    it('explains a sortable column on hover', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={rows} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'used']} />)
      await user.hover(screen.getByRole('columnheader', { name: /storage used/i }))
      expect(
        await screen.findByText(/Storage consumed, as Microsoft's usage report measures it/),
      ).toBeInTheDocument()
    })

    it('explains a non-sortable column on keyboard focus', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={rows} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'template']} />)
      await user.tab()
      await user.tab()
      await user.tab()
      expect(screen.getByRole('columnheader', { name: /template/i })).toHaveFocus()
      expect(
        await screen.findByText(/Team Channel and Group templates count as Teams/),
      ).toBeInTheDocument()
    })

    it('uses the caller wording for the name column when given', async () => {
      const user = userEvent.setup()
      render(
        <SiteTable
          rows={[drive]}
          poolUsedBytes={{ SharePoint: 500, OneDrive: 500 }}
          columns={['name']}
          nameHeader="Drive"
          nameHelp="The OneDrive account, named after its owner."
        />,
      )
      await user.hover(screen.getByRole('columnheader', { name: 'Drive' }))
      expect(await screen.findByText('The OneDrive account, named after its owner.')).toBeInTheDocument()
    })
  })

  it('renders the last-activity column when asked', () => {
    render(<SiteTable rows={rows} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'lastActivity']} />)
    expect(screen.getByRole('columnheader', { name: /last activity/i })).toBeInTheDocument()
    expect(screen.getByText('2026-08-01')).toBeInTheDocument()
  })

  it('renders the template column when asked', () => {
    render(<SiteTable rows={rows} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'template']} />)
    expect(screen.getByText('TEAMCHANNEL#0')).toBeInTheDocument()
  })

  it('says a site has no template reported, trims a padded one, and leaves a OneDrive template empty', () => {
    render(
      <SiteTable
        rows={[{ ...rows[0], template: ' ' }, { ...rows[1], template: ' STS#3 ' }, drive]}
        poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }}
        columns={['name', 'template']}
      />,
    )
    const templates = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1].textContent)
    expect(templates).toEqual(['STS#3', '', 'Template not reported'])
    const cell = screen.getByRole('cell', { name: 'Template not reported' })
    expect(within(cell).getByTitle('Template not reported')).toHaveTextContent('Template not reported')
    expect(cell).not.toHaveAttribute('title')
  })

  it('sorts by storage used descending by default', () => {
    render(<SiteTable rows={rows} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'used']} />)
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent('beta')
  })

  it('sorts by last activity, putting a never-active row last', async () => {
    const user = userEvent.setup()
    render(
      <SiteTable
        rows={[...rows, drive]}
        poolUsedBytes={{ SharePoint: 1500, OneDrive: 1500 }}
        columns={['name', 'lastActivity']}
      />,
    )
    await user.click(screen.getByRole('columnheader', { name: /last activity/i }))
    const cells = screen.getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('beta')
    expect(cells.at(-2)).toHaveTextContent('personal/d')
  })

  it('sorts by how far a drive is over its licence, not by how much it holds', async () => {
    const user = userEvent.setup()
    render(
      <SiteTable
        rows={[
          { ...drive, id: 'x', url: 'https://c-my.sharepoint.com/personal/x', storageUsedBytes: 900, allocatedBytes: 10_000, overEntitlementBytes: 100 },
          { ...drive, id: 'y', url: 'https://c-my.sharepoint.com/personal/y', storageUsedBytes: 800, allocatedBytes: 100_000, overEntitlementBytes: 300 },
        ]}
        poolUsedBytes={{ SharePoint: 1700, OneDrive: 1700 }}
        columns={['name', 'overEntitlement']}
      />,
    )
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent('personal/x')
    await user.click(screen.getByRole('columnheader', { name: /over licence by/i }))
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent('personal/y')
  })

  it('writes the over-licence excess in navy, which keeps body-text contrast on white', () => {
    render(
      <SiteTable
        rows={[{ ...drive, overEntitlementBytes: 300 }]}
        poolUsedBytes={{ SharePoint: 500, OneDrive: 500 }}
        columns={['name', 'overEntitlement']}
      />,
    )
    expect(screen.getAllByRole('cell')[1]).toHaveClass('text-p365-navy')
  })

  it('filters on search across url and owner', async () => {
    const user = userEvent.setup()
    render(<SiteTable rows={rows} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'owner']} />)
    await user.type(screen.getByRole('searchbox'), 'Grace')
    expect(screen.getByText('Grace')).toBeInTheDocument()
    expect(screen.queryByText('Ada')).not.toBeInTheDocument()
  })

  it('shows a drive capacity percentage where an allocation exists', () => {
    render(<SiteTable rows={[drive]} poolUsedBytes={{ SharePoint: 500, OneDrive: 500 }} columns={['name', 'capacity']} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows no capacity figure for a site, whose allocation is the 25 TB maximum', () => {
    render(<SiteTable rows={rows} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'capacity']} />)
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument()
  })

  it('gives each row its share of its own pool, a site of SharePoint and a OneDrive of OneDrive', () => {
    render(
      <SiteTable
        rows={[rows[0], drive]}
        poolUsedBytes={{ SharePoint: 3000, OneDrive: 1000 }}
        columns={['name', 'share']}
      />,
    )
    const shares = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1].textContent)
    expect(shares).toEqual(['50.0%', '10.0%'])
  })

  it('sorts the Share column by each row’s share of its pool, not by its size', async () => {
    const bigSite: StorageRow = { ...rows[0], storageUsedBytes: 900 }
    render(
      <SiteTable
        rows={[bigSite, drive]}
        poolUsedBytes={{ SharePoint: 30_000, OneDrive: 1000 }}
        columns={['name', 'share']}
      />,
    )
    await userEvent.setup().click(screen.getByRole('columnheader', { name: /share/i }))
    const shares = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1].textContent)
    expect(shares).toEqual(['50.0%', '3.0%'])
  })

  it('shows a tiny share as under 0.1%, never as 0.0%', () => {
    render(<SiteTable rows={[drive]} poolUsedBytes={{ SharePoint: 1000, OneDrive: 5_000_000 }} columns={['name', 'share']} />)
    const [cell] = within(screen.getAllByRole('row')[1]).getAllByRole('cell').slice(1)
    expect(cell).toHaveTextContent('<0.1%')
  })

  it('shows 0.0%, never Unknown, for a row of a pool that holds no storage', () => {
    render(
      <SiteTable
        rows={[{ ...drive, storageUsedBytes: 0 }]}
        poolUsedBytes={{ SharePoint: 1000, OneDrive: 0 }}
        columns={['name', 'share']}
      />,
    )
    const [cell] = within(screen.getAllByRole('row')[1]).getAllByRole('cell').slice(1)
    expect(cell).toHaveTextContent(/^0\.0%$/)
  })

  it('shows the resolved display name over a link to the site that opens in a new tab', () => {
    const named: StorageRow = { ...rows[0], name: 'Alpha Finance' }
    render(<SiteTable rows={[named]} poolUsedBytes={{ SharePoint: 300, OneDrive: 300 }} columns={['name']} />)
    expect(screen.getByText('Alpha Finance', { exact: true })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '/sites/alpha' })
    expect(link).toHaveAttribute('href', 'https://c.sharepoint.com/sites/alpha')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marks each row with its pool icon', () => {
    render(<SiteTable rows={[rows[0], drive]} poolUsedBytes={{ SharePoint: 800, OneDrive: 800 }} columns={['name']} />)
    expect(screen.getByRole('img', { name: 'SharePoint' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'OneDrive' })).toBeInTheDocument()
  })

  it('finds a site by its resolved display name', async () => {
    const user = userEvent.setup()
    const named: StorageRow[] = [{ ...rows[0], name: 'Finance' }, rows[1]]
    render(<SiteTable rows={named} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name']} />)
    await user.type(screen.getByRole('searchbox'), 'finan')
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Finance')).toBeInTheDocument()
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
    render(<SiteTable rows={[blank, drive]} poolUsedBytes={{ SharePoint: 800, OneDrive: 800 }} columns={['name']} />, getSiteDetails)

    expect(screen.getByLabelText('Looking up the site name')).toBeInTheDocument()
    expect(await screen.findByText('Finance')).toBeInTheDocument()
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
    render(<SiteTable rows={blank} poolUsedBytes={{ SharePoint: 1e6, OneDrive: 1e6 }} columns={['name']} />, getSiteDetails)

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('Payroll')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'payroll')
    expect(await screen.findByText('1 of 60')).toBeInTheDocument()
    expect(screen.getByText('Payroll')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '/sites/payroll' })).toBeInTheDocument()
  })

  it('does not look up rows that already carry a name', () => {
    const getSiteDetails = vi.fn(async () => new Map())
    render(<SiteTable rows={[{ ...rows[0], name: 'Alpha' }]} poolUsedBytes={{ SharePoint: 300, OneDrive: 300 }} columns={['name']} />, getSiteDetails)
    expect(getSiteDetails).not.toHaveBeenCalled()
  })

  it('names a URL-less site by its id, once, and never by its owner', async () => {
    const blank: StorageRow = { ...rows[0], id: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718', url: '' }
    render(<SiteTable rows={[blank]} poolUsedBytes={{ SharePoint: 300, OneDrive: 300 }} columns={['name']} />)
    expect(await screen.findAllByText('8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718')).toHaveLength(1)
    expect(screen.queryByText(blank.ownerDisplayName)).not.toBeInTheDocument()
  })

  it('finds a URL-less site by its id', async () => {
    const user = userEvent.setup()
    const twins: StorageRow[] = [
      { ...rows[0], id: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718', url: '' },
      { ...rows[0], id: 'e5f60718-1234-4f60-a1b2-000000000000', url: '' },
    ]
    render(<SiteTable rows={twins} poolUsedBytes={{ SharePoint: 600, OneDrive: 600 }} columns={['name']} />)
    await user.type(screen.getByRole('searchbox'), '8f3c1a2b')
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    expect(screen.getByText('8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718')).toBeInTheDocument()
  })

  describe('masked names', () => {
    const masked: StorageRow[] = [
      { ...rows[0], id: '3f9a1c0b7e2d4a65', url: '', ownerDisplayName: 'A.L.' },
      { ...rows[1], id: 'a1b2c3d4e5f60718', url: '', ownerDisplayName: 'G.H.' },
    ]

    it('renders a blurred stand-in for every name and owner, and never the masked values', () => {
      const { container } = render(
        <SiteTable rows={masked} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'owner', 'used']} nameMask="hidden" />,
      )
      expect(screen.getAllByRole('button', { name: 'Hidden name' })).toHaveLength(4)
      for (const value of ['3f9a1c0b7e2d4a65', 'a1b2c3d4e5f60718', 'A.L.', 'G.H.']) {
        expect(container.innerHTML).not.toContain(value)
      }
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('still finds a row by its pseudonym', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={masked} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name', 'used']} nameMask="hidden" />)
      await user.type(screen.getByRole('searchbox'), '3f9a1c0b')
      expect(screen.getByText('1 of 2')).toBeInTheDocument()
      expect(screen.getByText('300 B')).toBeInTheDocument()
    })

    it('looks up no site names while names are masked', () => {
      const getSiteDetails = vi.fn(async () => new Map())
      render(
        <SiteTable rows={masked} poolUsedBytes={{ SharePoint: 1000, OneDrive: 1000 }} columns={['name']} nameMask="concealed" />,
        getSiteDetails,
      )
      expect(getSiteDetails).not.toHaveBeenCalled()
      expect(screen.queryByLabelText('Looking up the site name')).not.toBeInTheDocument()
    })
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
      render(<SiteTable rows={many} poolUsedBytes={{ SharePoint: 1e6, OneDrive: 1e6 }} columns={['name', 'used']} />)
      expect(bodyRows()).toBe(50)
      expect(firstCell()).toHaveTextContent('team-0')
      expect(screen.getByText('1–50 of 120')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
    })

    it('pages forward, to the end, and back to the start', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} poolUsedBytes={{ SharePoint: 1e6, OneDrive: 1e6 }} columns={['name', 'used']} />)
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
      render(<SiteTable rows={many} poolUsedBytes={{ SharePoint: 1e6, OneDrive: 1e6 }} columns={['name', 'used']} />)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.click(screen.getByRole('combobox', { name: 'Rows per page' }))
      await user.click(await screen.findByRole('option', { name: '100' }))
      expect(bodyRows()).toBe(100)
      expect(screen.getByText('1–100 of 120')).toBeInTheDocument()
    })

    it('returns to the first page when the search changes', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} poolUsedBytes={{ SharePoint: 1e6, OneDrive: 1e6 }} columns={['name', 'owner']} />)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.type(screen.getByRole('searchbox'), 'Early')
      expect(screen.getByText('1–50 of 60')).toBeInTheDocument()
      expect(firstCell()).toHaveTextContent('team-0')
    })

    it('returns to the first page when the sort changes', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} poolUsedBytes={{ SharePoint: 1e6, OneDrive: 1e6 }} columns={['name', 'used']} />)
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.click(screen.getByRole('columnheader', { name: /storage used/i }))
      expect(screen.getByText('1–50 of 120')).toBeInTheDocument()
      expect(firstCell()).toHaveTextContent('team-119')
    })

    it('says so when nothing matches', async () => {
      const user = userEvent.setup()
      render(<SiteTable rows={many} poolUsedBytes={{ SharePoint: 1e6, OneDrive: 1e6 }} columns={['name']} />)
      await user.type(screen.getByRole('searchbox'), 'nobody')
      expect(screen.getByText('No rows')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    })
  })
})
