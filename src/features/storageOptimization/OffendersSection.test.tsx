import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import type { StorageRow } from '@/types/storage'
import { OffendersSection } from './OffendersSection'
import { base } from './testFixtures'

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
afterEach(cleanup)

const site = (id: string, bytes: number, over: Partial<StorageRow> = {}): StorageRow => ({
  pool: 'SharePoint',
  id,
  url: `https://c.sharepoint.com/sites/${id}`,
  ownerDisplayName: `Owner ${id}`,
  storageUsedBytes: bytes,
  fileCount: 10,
  activeFileCount: 1,
  lastActivityDate: '2026-08-01',
  isDeleted: false,
  template: 'STS#3',
  ...over,
})

const drive = (id: string, bytes: number): StorageRow => ({
  pool: 'OneDrive',
  id,
  url: `https://c-my.sharepoint.com/personal/${id}`,
  ownerDisplayName: `Drive ${id}`,
  storageUsedBytes: bytes,
  fileCount: 4,
  activeFileCount: 1,
  lastActivityDate: '2026-07-01',
  isDeleted: false,
  allocatedBytes: 1000,
})

const rows = [site('alpha', 300), site('beta', 700), drive('dana', 500)]

const withSites = {
  ...base,
  offenders: {
    rows,
    totalUsedBytes: 1500,
    topConsumers: [
      { name: 'beta', value: 700 },
      { name: 'dana', value: 500 },
      { name: 'alpha', value: 300 },
    ],
    topSites: [
      { name: 'beta', value: 700 },
      { name: 'alpha', value: 300 },
    ],
    topDrives: [{ name: 'dana', value: 500 }],
    retained: { bytes: 42, count: 2 },
  },
}

describe('OffendersSection', () => {
  it('names the section and the top-consumers chart', () => {
    render(<OffendersSection overview={withSites} />)
    expect(screen.getByRole('heading', { name: /main offenders/i })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /biggest sites & onedrives by storage/i }),
    ).toHaveAccessibleName()
  })

  it('reports deleted content that is still consuming quota', () => {
    render(<OffendersSection overview={withSites} />)
    expect(screen.getByText(/deleted but still billing/i)).toBeInTheDocument()
  })

  it('omits the deleted panel when nothing is retained', () => {
    const none = {
      ...withSites,
      offenders: { ...withSites.offenders, retained: { bytes: 0, count: 0 } },
    }
    render(<OffendersSection overview={none} />)
    expect(screen.queryByText(/deleted but still billing/i)).not.toBeInTheDocument()
  })

  it('shows the retained total the model counted', () => {
    const both = {
      ...withSites,
      offenders: { ...withSites.offenders, retained: { bytes: 50, count: 3 } },
    }
    render(<OffendersSection overview={both} />)
    expect(screen.getByText(/3 sites and drives/i)).toBeInTheDocument()
    expect(screen.getByText('50 B')).toBeInTheDocument()
  })

  it('renders the detail table with a last-activity column', () => {
    render(<OffendersSection overview={withSites} />)
    expect(screen.getByRole('columnheader', { name: /last activity/i })).toBeInTheDocument()
  })

  it('lists both pools in the detail table', () => {
    render(<OffendersSection overview={withSites} />)
    expect(screen.getByText(/personal\/dana/)).toBeInTheDocument()
    expect(screen.getByText(/sites\/beta/)).toBeInTheDocument()
  })

  it('carries no sales footer under the table', () => {
    render(<OffendersSection overview={withSites} />)
    expect(screen.queryByText(/full discovery/i)).not.toBeInTheDocument()
  })

  it('explains concealed names above the table only when the tenant conceals them', () => {
    const { unmount } = render(<OffendersSection overview={withSites} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    unmount()

    const concealed = { ...withSites, caveats: { ...withSites.caveats, namesAreConcealed: true } }
    render(<OffendersSection overview={concealed} />)
    expect(screen.getByRole('status')).toHaveTextContent(/appear as hashes/i)
  })
})
