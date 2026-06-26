import type {
  AzureCost,
  AzureResourceCount,
  AzureSubscription,
  EmailActivityPoint,
  LicenseSku,
  MailboxSummary,
  OrgInfo,
  ReportPeriod,
  SharePointSummary,
  UsagePoint,
} from '../types/reports'

export interface DataSource {
  getSharePoint(period: ReportPeriod): Promise<SharePointSummary>
  getLicenses(): Promise<LicenseSku[]>
  getOrg(): Promise<OrgInfo>
  getActiveUsers(period: ReportPeriod): Promise<UsagePoint[]>
  getOneDriveUsage(period: ReportPeriod): Promise<UsagePoint[]>
  getTeamsActivity(period: ReportPeriod): Promise<UsagePoint[]>
  getMailbox(period: ReportPeriod): Promise<MailboxSummary>
  getEmailActivity(period: ReportPeriod): Promise<EmailActivityPoint[]>
  getAzureSubscriptions(): Promise<AzureSubscription[]>
  getAzureResourceCounts(subId: string): Promise<AzureResourceCount[]>
  getAzureCost(subId: string): Promise<AzureCost>
}

const DAYS = 9
/** Generate ISO dates (yyyy-mm-dd) ending today, oldest first. */
function recentDates(count = DAYS): string[] {
  const out: string[] = []
  const base = new Date('2026-06-26T00:00:00Z')
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function series(values: number[]): UsagePoint[] {
  const dates = recentDates(values.length)
  return values.map((value, i) => ({ date: dates[i], value }))
}

const sharePoint: SharePointSummary = (() => {
  const sites = [
    {
      siteId: 'site-1',
      siteUrl: 'https://contoso.sharepoint.com/sites/marketing',
      ownerDisplayName: 'Alice Marketing',
      fileCount: 4200,
      activeFileCount: 380,
      storageUsedBytes: 53_687_091_200,
      storageAllocatedBytes: 274_877_906_944,
    },
    {
      siteId: 'site-2',
      siteUrl: 'https://contoso.sharepoint.com/sites/engineering',
      ownerDisplayName: 'Bob Engineering',
      fileCount: 18_900,
      activeFileCount: 2_140,
      storageUsedBytes: 161_061_273_600,
      storageAllocatedBytes: 549_755_813_888,
    },
    {
      siteId: 'site-3',
      siteUrl: 'https://contoso.sharepoint.com/sites/hr',
      ownerDisplayName: 'Carol HR',
      fileCount: 1_350,
      activeFileCount: 96,
      storageUsedBytes: 10_737_418_240,
      storageAllocatedBytes: 109_951_162_777,
    },
    {
      siteId: 'site-4',
      siteUrl: 'https://contoso.sharepoint.com/sites/sales',
      ownerDisplayName: 'Dan Sales',
      fileCount: 7_640,
      activeFileCount: 905,
      storageUsedBytes: 85_899_345_920,
      storageAllocatedBytes: 274_877_906_944,
    },
  ]
  return {
    totalSites: sites.length,
    totalFiles: sites.reduce((a, s) => a + s.fileCount, 0),
    activeFiles: sites.reduce((a, s) => a + s.activeFileCount, 0),
    storageUsedBytes: sites.reduce((a, s) => a + s.storageUsedBytes, 0),
    storageAllocatedBytes: sites.reduce((a, s) => a + s.storageAllocatedBytes, 0),
    sites,
  }
})()

const licenses: LicenseSku[] = [
  { skuId: 'sku-e5', skuPartNumber: 'SPE_E5', consumed: 184, enabled: 200, available: 16 },
  { skuId: 'sku-e3', skuPartNumber: 'SPE_E3', consumed: 412, enabled: 500, available: 88 },
  { skuId: 'sku-f3', skuPartNumber: 'SPE_F3', consumed: 95, enabled: 150, available: 55 },
  {
    skuId: 'sku-pbi',
    skuPartNumber: 'POWER_BI_PRO',
    consumed: 47,
    enabled: 50,
    available: 3,
  },
]

const org: OrgInfo = {
  displayName: 'Contoso Ltd',
  verifiedDomain: 'contoso.onmicrosoft.com',
  country: 'GB',
}

const mailbox: MailboxSummary = {
  totalMailboxes: 742,
  activeMailboxes: 689,
  storageUsedBytes: 4_398_046_511_104,
}

const emailActivity: EmailActivityPoint[] = recentDates().map((date, i) => ({
  date,
  send: 1200 + i * 35,
  receive: 4800 + i * 60,
  read: 3900 + i * 50,
}))

const subscriptions: AzureSubscription[] = [
  { subscriptionId: 'sub1', displayName: 'Production', state: 'Enabled' },
]

const resourceCounts: AzureResourceCount[] = [
  { type: 'Microsoft.Compute/virtualMachines', count: 24 },
  { type: 'Microsoft.Storage/storageAccounts', count: 17 },
  { type: 'Microsoft.Network/networkInterfaces', count: 31 },
  { type: 'Microsoft.Web/sites', count: 9 },
  { type: 'Microsoft.Sql/servers', count: 4 },
]

const azureCost: AzureCost = {
  subscriptionId: 'sub1',
  currency: 'GBP',
  amount: 12_847.63,
}

export function createMockDataSource(): DataSource {
  return {
    getSharePoint: async () => sharePoint,
    getLicenses: async () => licenses,
    getOrg: async () => org,
    getActiveUsers: async () =>
      series([1820, 1875, 1903, 1860, 1940, 1988, 2012, 2045, 2090]),
    getOneDriveUsage: async () =>
      series([
        2.10e12, 2.14e12, 2.17e12, 2.21e12, 2.24e12, 2.28e12, 2.31e12, 2.35e12, 2.40e12,
      ]),
    getTeamsActivity: async () =>
      series([8400, 9120, 8870, 9560, 10230, 9980, 11040, 11580, 12010]),
    getMailbox: async () => mailbox,
    getEmailActivity: async () => emailActivity,
    getAzureSubscriptions: async () => subscriptions,
    getAzureResourceCounts: async (subId: string) =>
      resourceCounts.map((r) => ({ ...r })).filter(() => subId.length > 0),
    getAzureCost: async (subId: string) => ({ ...azureCost, subscriptionId: subId }),
  }
}
