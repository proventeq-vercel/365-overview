import { describe, it, expect } from 'vitest'
import { createMockDataSource } from './fixtures'

describe('mock data source', () => {
  it('returns non-empty sharepoint summary', async () => {
    const s = await createMockDataSource().getSharePoint('D30')
    expect(s.totalSites).toBeGreaterThan(0)
    expect(s.sites.length).toBe(s.totalSites)
  })
  it('returns licenses', async () => {
    expect((await createMockDataSource().getLicenses()).length).toBeGreaterThan(0)
  })
  it('returns org', async () => {
    expect((await createMockDataSource().getOrg()).displayName).toBeTruthy()
  })
})
