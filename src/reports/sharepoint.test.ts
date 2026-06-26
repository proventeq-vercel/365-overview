import { describe, it, expect } from 'vitest'
import { parseSharePointDetail, type RawSpoRow } from './sharepoint'

// Live-shape fixtures: Graph returns camelCase resource property names with
// ?$format=application/json. Numeric fields arrive as real numbers here to
// prove the coercion helper accepts numbers as well as strings.
const rows: RawSpoRow[] = [
  {
    siteId: 's1',
    siteUrl: 'https://a',
    ownerDisplayName: 'A',
    fileCount: 10,
    activeFileCount: 3,
    storageUsedInBytes: 1000,
    storageAllocatedInBytes: 5000,
  },
  {
    // strings here prove the helper still coerces numeric strings
    siteId: 's2',
    siteUrl: 'https://b',
    ownerDisplayName: 'B',
    fileCount: '20',
    activeFileCount: '5',
    storageUsedInBytes: '2000',
    storageAllocatedInBytes: '5000',
  },
]

describe('parseSharePointDetail', () => {
  it('aggregates totals and maps sites', () => {
    const s = parseSharePointDetail(rows)
    expect(s.totalSites).toBe(2)
    expect(s.totalFiles).toBe(30)
    expect(s.activeFiles).toBe(8)
    expect(s.storageUsedBytes).toBe(3000)
    expect(s.sites[0]).toMatchObject({ siteId: 's1', fileCount: 10, storageUsedBytes: 1000 })
  })
  it('handles empty input', () => {
    expect(parseSharePointDetail([])).toMatchObject({ totalSites: 0, totalFiles: 0, sites: [] })
  })
})
