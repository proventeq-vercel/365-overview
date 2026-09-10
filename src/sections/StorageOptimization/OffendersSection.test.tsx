import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
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

const withSites = {
  ...base,
  sharePoint: {
    ...base.sharePoint,
    sites: [site('alpha', 300), site('beta', 700)],
    deletedButBilling: { bytes: 42, count: 2 },
  },
  oneDrive: { ...base.oneDrive, drives: [drive('dana', 500)] },
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
      sharePoint: { ...withSites.sharePoint, deletedButBilling: { bytes: 0, count: 0 } },
      oneDrive: { ...withSites.oneDrive, deletedButBilling: { bytes: 0, count: 0 } },
    }
    render(<OffendersSection overview={none} />)
    expect(screen.queryByText(/deleted but still billing/i)).not.toBeInTheDocument()
  })

  it('counts deleted sites and drives together in the retained total', () => {
    const both = {
      ...withSites,
      sharePoint: { ...withSites.sharePoint, deletedButBilling: { bytes: 42, count: 2 } },
      oneDrive: { ...withSites.oneDrive, deletedButBilling: { bytes: 8, count: 1 } },
    }
    render(<OffendersSection overview={both} />)
    expect(screen.getByText(/3 sites and drives/i)).toBeInTheDocument()
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

  it('carries the full-discovery line under the table', () => {
    render(<OffendersSection overview={withSites} />)
    expect(screen.getByText(/full discovery/i)).toBeInTheDocument()
  })
})
