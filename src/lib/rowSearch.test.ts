import { describe, expect, it } from 'vitest'
import type { SiteDirectory } from '@/reports/siteDirectory'
import type { StorageRow } from '@/types/storage'
import { buildSearchIndex, knownSiteHits, normaliseQuery, searchOrder, sortOrder } from './rowSearch'

const row = (overrides: Partial<StorageRow>): StorageRow => ({
  pool: 'SharePoint',
  id: 'id',
  url: '',
  ownerDisplayName: 'Owner',
  storageUsedBytes: 0,
  fileCount: 0,
  activeFileCount: 0,
  lastActivityDate: null,
  isDeleted: false,
  ...overrides,
})

const rows: StorageRow[] = [
  row({ id: 'A1', name: 'Finance', url: 'https://c.sharepoint.com/sites/Finance', storageUsedBytes: 10, lastActivityDate: '2026-03-01' }),
  row({ id: 'B2', ownerDisplayName: 'Grace Hopper', storageUsedBytes: 30, lastActivityDate: null }),
  row({ id: 'C3', url: 'https://c.sharepoint.com/sites/legal', storageUsedBytes: 20, lastActivityDate: '2026-08-01' }),
]

const NONE: SiteDirectory = new Map()
const index = buildSearchIndex(rows)
const byUsed = sortOrder(rows, (r) => r.storageUsedBytes, 'desc')

describe('normaliseQuery', () => {
  it('trims and lower-cases', () => {
    expect(normaliseQuery('  FiN ')).toBe('fin')
  })
})

describe('sortOrder', () => {
  it('orders indices by the sort value in the requested direction', () => {
    expect(byUsed).toEqual([1, 2, 0])
    expect(sortOrder(rows, (r) => r.storageUsedBytes, 'asc')).toEqual([0, 2, 1])
  })

  it('keeps the incoming order for ties', () => {
    expect(sortOrder(rows, () => 0, 'desc')).toEqual([0, 1, 2])
  })
})

describe('searchOrder', () => {
  it('returns the sorted order untouched for an empty query', () => {
    expect(searchOrder(byUsed, index, '', NONE)).toBe(byUsed)
  })

  it('matches name, url, owner and id case-insensitively, keeping the sort order', () => {
    expect(searchOrder(byUsed, index, 'finance', NONE)).toEqual([0])
    expect(searchOrder(byUsed, index, 'hopper', NONE)).toEqual([1])
    expect(searchOrder(byUsed, index, '/sites/legal', NONE)).toEqual([2])
    expect(searchOrder(byUsed, index, 'c3', NONE)).toEqual([2])
    expect(searchOrder(byUsed, index, 'sharepoint', NONE)).toEqual([2, 0])
  })

  it('matches a name or url the tenant directory resolved for a row after the index was built', () => {
    const known: SiteDirectory = new Map([
      ['b2', { name: 'Payroll', url: 'https://c.sharepoint.com/sites/payroll-archive' }],
    ])
    expect(searchOrder(byUsed, index, 'payroll', known)).toEqual([1])
    expect(searchOrder(byUsed, index, 'payroll-archive', known)).toEqual([1])
    expect(searchOrder(byUsed, index, 'payroll', NONE)).toEqual([])
  })
})

describe('knownSiteHits', () => {
  it('collects the ids whose resolved name or url contains the query, and nothing for an empty one', () => {
    const known: SiteDirectory = new Map([
      ['b2', { name: 'Payroll', url: '' }],
      ['c3', { name: 'Legal', url: 'https://c.sharepoint.com/sites/payroll-old' }],
    ])
    expect([...knownSiteHits(known, 'payroll')]).toEqual(['b2', 'c3'])
    expect(knownSiteHits(known, '').size).toBe(0)
  })
})
