import type { LicenseSku, OrgInfo, UsagePoint } from '../types/reports'
import type { StorageRow } from '../types/storage'

export type MockScenario = 'healthy' | 'over-entitlement' | 'concealed' | 'short-history'

export interface DataSource {
  getSites(): Promise<StorageRow[]>
  getDrives(): Promise<StorageRow[]>
  getSharePointTrend(): Promise<UsagePoint[]>
  getOneDriveTrend(): Promise<UsagePoint[]>
  getLicenses(): Promise<LicenseSku[]>
  getOrg(): Promise<OrgInfo>
  getReportRefreshDate(): Promise<string>
}

const GB = 1_073_741_824
const ONE_DRIVE_CAP_BYTES = 1024 * GB

export const MOCK_REFRESH_DATE = '2026-08-30'

const TEMPLATES = ['STS#3', 'GROUP#0', 'TEAMCHANNEL#0', 'SITEPAGEPUBLISHING#0', 'STS#0']

/** Month ends counting back from the refresh date, oldest first. */
function monthEnds(count: number): string[] {
  const out: string[] = []
  const [year, month] = MOCK_REFRESH_DATE.split('-').map(Number)
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(year, month - 1 - i + 1, 0))
    out.push(date.toISOString().slice(0, 10))
  }
  return out
}

function series(values: number[]): UsagePoint[] {
  const dates = monthEnds(values.length)
  return values.map((value, i) => ({ date: dates[i], value }))
}

function hashName(seed: number): string {
  let hex = ''
  for (let i = 0; i < 32; i++) {
    hex += ((seed * 31 + i * 7) % 16).toString(16).toUpperCase()
  }
  return hex
}

/**
 * Deterministically generate a large, long-tailed site set so virtualization
 * and scale behaviour are exercised in mock mode and e2e. No Math.random / Date
 * so tests stay stable. Every 250th site is a big consumer (a realistic tail).
 */
function generateSites(count: number, concealed = false): StorageRow[] {
  const out: StorageRow[] = []
  for (let i = 0; i < count; i++) {
    const fileCount = (i % 900) * 10 + 50
    let gb = 1 + ((i * 37) % 200)
    if (i % 250 === 0) gb += 2000
    out.push({
      pool: 'SharePoint',
      id: `gen-${i}`,
      url: concealed ? '' : `https://contoso.sharepoint.com/sites/team-${i}`,
      ownerDisplayName: concealed ? hashName(i) : `Owner ${i}`,
      storageUsedBytes: gb * GB,
      fileCount,
      activeFileCount: Math.round(fileCount * 0.1),
      lastActivityDate: i % 17 === 0 ? null : `2026-0${(i % 8) + 1}-1${i % 10}`,
      isDeleted: i % 500 === 3,
      template: TEMPLATES[i % TEMPLATES.length],
    })
  }
  return out
}

function namedSites(concealed: boolean): StorageRow[] {
  const named = [
    ['site-1', 'marketing', 'Alice Marketing', 50, 4200, 380, 'STS#3'],
    ['site-2', 'engineering', 'Bob Engineering', 150, 18_900, 2140, 'TEAMCHANNEL#0'],
    ['site-3', 'hr', 'Carol HR', 10, 1350, 96, 'GROUP#0'],
    ['site-4', 'sales', 'Dan Sales', 80, 7640, 905, 'STS#3'],
  ] as const
  return named.map(([id, slug, owner, gb, files, active, template], i) => ({
    pool: 'SharePoint' as const,
    id,
    url: concealed ? '' : `https://contoso.sharepoint.com/sites/${slug}`,
    ownerDisplayName: concealed ? hashName(1000 + i) : owner,
    storageUsedBytes: gb * GB,
    fileCount: files,
    activeFileCount: active,
    lastActivityDate: `2026-08-2${i}`,
    isDeleted: false,
    template,
  }))
}

function generateDrives(count: number, concealed = false): StorageRow[] {
  const out: StorageRow[] = []
  for (let i = 0; i < count; i++) {
    const nearCap = i % 40 === 0
    const gb = nearCap ? 950 + (i % 40) : 5 + ((i * 13) % 400)
    out.push({
      pool: 'OneDrive',
      id: concealed ? hashName(2000 + i) : `user${i}@contoso.com`,
      url: concealed ? '' : `https://contoso-my.sharepoint.com/personal/user${i}`,
      ownerDisplayName: concealed ? hashName(3000 + i) : `User ${i}`,
      storageUsedBytes: gb * GB,
      fileCount: (i % 300) * 5 + 20,
      activeFileCount: (i % 30) * 2,
      lastActivityDate: i % 23 === 0 ? null : `2026-0${(i % 8) + 1}-2${i % 9}`,
      isDeleted: i % 300 === 7,
      template: undefined,
      allocatedBytes: ONE_DRIVE_CAP_BYTES,
    })
  }
  return out
}

const licenses: LicenseSku[] = [
  { skuId: 'sku-e5', skuPartNumber: 'SPE_E5', consumed: 184, enabled: 200, available: 16 },
  { skuId: 'sku-e3', skuPartNumber: 'SPE_E3', consumed: 412, enabled: 500, available: 88 },
  { skuId: 'sku-f3', skuPartNumber: 'SPE_F3', consumed: 95, enabled: 150, available: 55 },
  {
    skuId: 'sku-flow',
    skuPartNumber: 'FLOW_FREE',
    consumed: 116,
    enabled: 10_000,
    available: 9884,
  },
]

const org: OrgInfo = {
  displayName: 'Contoso Ltd',
  verifiedDomain: 'contoso.onmicrosoft.com',
  country: 'GB',
}

const SIX_MONTH_SHAREPOINT = [5200, 5340, 5495, 5610, 5780, 5900].map((gb) => gb * GB)
const SIX_MONTH_ONEDRIVE = [2100, 2140, 2170, 2210, 2240, 2280].map((gb) => gb * GB)
const OVER_ENTITLEMENT_SHAREPOINT = [8100, 8420, 8780, 9100, 9460, 9820].map((gb) => gb * GB)
const SHORT_SHAREPOINT = [5780, 5900].map((gb) => gb * GB)
const SHORT_ONEDRIVE = [2240, 2280].map((gb) => gb * GB)

interface ScenarioData {
  sites: StorageRow[]
  drives: StorageRow[]
  sharePointTrend: UsagePoint[]
  oneDriveTrend: UsagePoint[]
}

function scenarioData(scenario: MockScenario): ScenarioData {
  const concealed = scenario === 'concealed'
  const sites = [...namedSites(concealed), ...generateSites(2500, concealed)]
  const drives = generateDrives(400, concealed)

  if (scenario === 'short-history') {
    return {
      sites,
      drives,
      sharePointTrend: series(SHORT_SHAREPOINT),
      oneDriveTrend: series(SHORT_ONEDRIVE),
    }
  }

  return {
    sites,
    drives,
    sharePointTrend: series(
      scenario === 'over-entitlement' ? OVER_ENTITLEMENT_SHAREPOINT : SIX_MONTH_SHAREPOINT,
    ),
    oneDriveTrend: series(SIX_MONTH_ONEDRIVE),
  }
}

export function createMockDataSource(scenario: MockScenario = 'healthy'): DataSource {
  const data = scenarioData(scenario)
  return {
    getSites: async () => data.sites,
    getDrives: async () => data.drives,
    getSharePointTrend: async () => data.sharePointTrend,
    getOneDriveTrend: async () => data.oneDriveTrend,
    getLicenses: async () => licenses,
    getOrg: async () => org,
    getReportRefreshDate: async () => MOCK_REFRESH_DATE,
  }
}
