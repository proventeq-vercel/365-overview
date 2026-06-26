import { describe, it, expect } from 'vitest'
import { parseSharePointDetail } from './sharepoint'

const rows = [
  { 'Site Id': 's1', 'Site URL': 'https://a', 'Owner Display Name': 'A', 'File Count': '10', 'Active File Count': '3', 'Storage Used (Byte)': '1000', 'Storage Allocated (Byte)': '5000' },
  { 'Site Id': 's2', 'Site URL': 'https://b', 'Owner Display Name': 'B', 'File Count': '20', 'Active File Count': '5', 'Storage Used (Byte)': '2000', 'Storage Allocated (Byte)': '5000' },
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
