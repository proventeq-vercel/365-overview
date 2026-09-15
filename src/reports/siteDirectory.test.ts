import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import { parseSiteDirectory, siteCollectionIdOf, withSiteDirectory } from './siteDirectory'

const FINANCE_ID = '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718'

const directory = parseSiteDirectory([
  {
    id: `contoso.sharepoint.com,${FINANCE_ID.toUpperCase()},0a1b2c3d-1111-2222-3333-444455556666`,
    displayName: 'Finance',
    webUrl: 'https://contoso.sharepoint.com/sites/finance',
  },
  { id: 'contoso.sharepoint.com,ffffffff-0000-0000-0000-000000000000,1', webUrl: 'https://x' },
  { displayName: 'no id' },
])

const reportRow = (over: Partial<StorageRow>): StorageRow => ({
  pool: 'SharePoint',
  id: FINANCE_ID,
  url: '',
  ownerDisplayName: 'SharePoint Admin',
  storageUsedBytes: 10,
  fileCount: 1,
  activeFileCount: 0,
  lastActivityDate: null,
  isDeleted: false,
  ...over,
})

describe('siteCollectionIdOf', () => {
  it('takes the middle segment of a composite Graph site id, lower-cased', () => {
    expect(siteCollectionIdOf('contoso.sharepoint.com,ABC-123,web-1')).toBe('abc-123')
  })

  it('keeps a bare id as is', () => {
    expect(siteCollectionIdOf('ABC-123')).toBe('abc-123')
  })
})

describe('parseSiteDirectory', () => {
  it('keys each site by its site-collection id and skips rows without one', () => {
    expect(directory.size).toBe(2)
    expect(directory.get(FINANCE_ID)).toEqual({
      name: 'Finance',
      url: 'https://contoso.sharepoint.com/sites/finance',
    })
  })

  it('leaves a missing display name empty rather than undefined', () => {
    expect(directory.get('ffffffff-0000-0000-0000-000000000000')).toEqual({
      name: '',
      url: 'https://x',
    })
  })
})

describe('withSiteDirectory', () => {
  it('fills the name and the URL the usage report left blank', () => {
    const [row] = withSiteDirectory([reportRow({})], directory)
    expect(row.name).toBe('Finance')
    expect(row.url).toBe('https://contoso.sharepoint.com/sites/finance')
  })

  it('matches the report id case-insensitively', () => {
    const [row] = withSiteDirectory([reportRow({ id: FINANCE_ID.toUpperCase() })], directory)
    expect(row.name).toBe('Finance')
  })

  it('keeps a URL the report did carry', () => {
    const [row] = withSiteDirectory(
      [reportRow({ url: 'https://contoso.sharepoint.com/sites/finance/' })],
      directory,
    )
    expect(row.url).toBe('https://contoso.sharepoint.com/sites/finance/')
  })

  it('leaves a row alone when the directory does not know it, such as a deleted site', () => {
    const unknown = reportRow({ id: 'deleted-site', isDeleted: true })
    const [row] = withSiteDirectory([unknown], directory)
    expect(row).toBe(unknown)
  })
})
