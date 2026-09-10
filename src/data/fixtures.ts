import type {
  LicenseSku,
  OrgInfo,
  ReportPeriod,
  SharePointSite,
  SharePointSummary,
} from '../types/reports'

export interface DataSource {
  getSharePoint(period: ReportPeriod): Promise<SharePointSummary>
  getLicenses(): Promise<LicenseSku[]>
  getOrg(): Promise<OrgInfo>
}

/** 25 TB — the real default per-site storage quota Graph reports. */
const SITE_QUOTA_BYTES = 27_487_790_694_400

/**
 * Deterministically generate a large, long-tailed site set so virtualization
 * and scale behaviour are exercised in mock mode and e2e. No Math.random / Date
 * so tests stay stable. Every 250th site is a big consumer (a realistic tail).
 */
function generateSites(count: number): SharePointSite[] {
  const out: SharePointSite[] = []
  for (let i = 0; i < count; i++) {
    const fileCount = (i % 900) * 10 + 50
    let gb = 1 + ((i * 37) % 200)
    if (i % 250 === 0) gb += 2000
    out.push({
      siteId: `gen-${i}`,
      siteUrl: `https://contoso.sharepoint.com/sites/team-${i}`,
      ownerDisplayName: `Owner ${i}`,
      fileCount,
      activeFileCount: Math.round(fileCount * 0.1),
      storageUsedBytes: gb * 1_073_741_824,
      storageAllocatedBytes: SITE_QUOTA_BYTES,
    })
  }
  return out
}

const sharePoint: SharePointSummary = (() => {
  const namedSites: SharePointSite[] = [
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
  const sites = [...namedSites, ...generateSites(2500)]
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

export function createMockDataSource(): DataSource {
  return {
    getSharePoint: async () => sharePoint,
    getLicenses: async () => licenses,
    getOrg: async () => org,
  }
}
