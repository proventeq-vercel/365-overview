import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import userEvent from '@testing-library/user-event'
import type { StorageRow } from '@/types/storage'
import { SiteTable } from './SiteTable'

// jsdom reports 0 for layout boxes; @tanstack/react-virtual measures its scroll
// container via offsetWidth/offsetHeight and renders no rows when they are 0.
const heightDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
const widthDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 480,
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 800,
  })
})
afterAll(() => {
  if (heightDesc) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', heightDesc)
  if (widthDesc) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', widthDesc)
})

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

  it('stays windowed on a large estate', () => {
    const many: StorageRow[] = Array.from({ length: 2500 }, (_, i) => ({
      ...rows[0],
      id: `gen-${i}`,
      url: `https://c.sharepoint.com/sites/team-${i}`,
    }))
    render(<SiteTable rows={many} totalUsedBytes={1e6} columns={['name', 'used']} />)
    expect(screen.getAllByRole('row').length).toBeLessThan(100)
  })
})
