import { describe, it, expect } from 'vitest'
import { createMockDataSource } from './fixtures'

describe('mock data source', () => {
  it('returns non-empty sharepoint summary', async () => {
    const s = await createMockDataSource().getSharePoint('D30')
    expect(s.totalSites).toBeGreaterThan(0)
    expect(s.sites.length).toBe(s.totalSites)
  })
  it('returns licenses and azure cost', async () => {
    const ds = createMockDataSource()
    expect((await ds.getLicenses()).length).toBeGreaterThan(0)
    expect((await ds.getAzureCost('sub1')).amount).toBeGreaterThan(0)
  })
  it('returns at least 7-point time series for usage methods', async () => {
    const ds = createMockDataSource()
    expect((await ds.getActiveUsers('D30')).length).toBeGreaterThanOrEqual(7)
    expect((await ds.getOneDriveUsage('D30')).length).toBeGreaterThanOrEqual(7)
    expect((await ds.getTeamsActivity('D30')).length).toBeGreaterThanOrEqual(7)
    expect((await ds.getEmailActivity('D30')).length).toBeGreaterThanOrEqual(7)
  })
  it('returns org, mailbox, subscriptions and resource counts', async () => {
    const ds = createMockDataSource()
    expect((await ds.getOrg()).displayName).toBeTruthy()
    expect((await ds.getMailbox('D30')).totalMailboxes).toBeGreaterThan(0)
    const subs = await ds.getAzureSubscriptions()
    expect(subs.length).toBeGreaterThan(0)
    expect((await ds.getAzureResourceCounts(subs[0].subscriptionId)).length).toBeGreaterThan(0)
  })
})
