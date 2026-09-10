import { describe, it, expect } from 'vitest'
import { parseSharePointSites, reportRefreshDateOf } from './sharePointSites'

const row = (over: Record<string, unknown> = {}) => ({
  reportRefreshDate: '2026-08-30',
  siteId: 'site-1',
  siteUrl: 'https://contoso.sharepoint.com/sites/finance',
  ownerDisplayName: 'Ada Lovelace',
  isDeleted: 'False',
  lastActivityDate: '2026-08-28',
  fileCount: '1200',
  activeFileCount: '340',
  storageUsedInBytes: '5000000',
  storageAllocatedInBytes: '27487790694400',
  rootWebTemplate: 'Team Site',
  ...over,
})

describe('parseSharePointSites', () => {
  it('coerces Graph string numerics to numbers', () => {
    const [site] = parseSharePointSites([row()])
    expect(site.storageUsedBytes).toBe(5_000_000)
    expect(site.fileCount).toBe(1200)
    expect(site.activeFileCount).toBe(340)
  })

  it('coerces Graph True/False strings to booleans', () => {
    expect(parseSharePointSites([row({ isDeleted: 'True' })])[0].isDeleted).toBe(true)
    expect(parseSharePointSites([row({ isDeleted: 'False' })])[0].isDeleted).toBe(false)
  })

  it('treats a real boolean from Graph as itself', () => {
    expect(parseSharePointSites([row({ isDeleted: true })])[0].isDeleted).toBe(true)
    expect(parseSharePointSites([row({ isDeleted: false })])[0].isDeleted).toBe(false)
  })

  it('tags every row as the SharePoint pool', () => {
    expect(parseSharePointSites([row()])[0].pool).toBe('SharePoint')
  })

  it('carries the root web template through', () => {
    expect(parseSharePointSites([row()])[0].template).toBe('Team Site')
  })

  it('never populates allocatedBytes, because the site value is the 25 TB maximum', () => {
    expect(parseSharePointSites([row()])[0].allocatedBytes).toBeUndefined()
  })

  it('turns an empty lastActivityDate into null, not an empty string', () => {
    expect(parseSharePointSites([row({ lastActivityDate: '' })])[0].lastActivityDate).toBeNull()
  })

  it('falls back to the site URL when Graph omits the id', () => {
    const [site] = parseSharePointSites([row({ siteId: undefined })])
    expect(site.id).toBe('https://contoso.sharepoint.com/sites/finance')
  })

  it('reads a missing or unparseable numeric as zero rather than NaN', () => {
    const [site] = parseSharePointSites([
      row({ fileCount: undefined, storageUsedInBytes: '', activeFileCount: 'N/A' }),
    ])
    expect(site.fileCount).toBe(0)
    expect(site.storageUsedBytes).toBe(0)
    expect(site.activeFileCount).toBe(0)
  })
})

describe('reportRefreshDateOf', () => {
  it('reads the refresh date from the first row that has one', () => {
    expect(reportRefreshDateOf([{}, { reportRefreshDate: '2026-08-30' }])).toBe('2026-08-30')
  })

  it('is an empty string when no row carries one', () => {
    expect(reportRefreshDateOf([])).toBe('')
  })
})
