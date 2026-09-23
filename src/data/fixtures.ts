import type { LicenseSku, OrgInfo, UsagePoint } from '../types/reports'
import type { StorageRow } from '../types/storage'
import type { SiteDirectory } from '../reports/siteDirectory'

export type MockScenario = 'healthy' | 'over-entitlement' | 'concealed' | 'short-history'

export interface DataSource {
  getSites(): Promise<StorageRow[]>
  getSiteDetails(ids: string[]): Promise<SiteDirectory>
  getSiteDirectory(): Promise<SiteDirectory>
  getDrives(): Promise<StorageRow[]>
  getSharePointTrend(): Promise<UsagePoint[]>
  getOneDriveTrend(): Promise<UsagePoint[]>
  getLicenses(): Promise<LicenseSku[] | null>
  getOrg(): Promise<OrgInfo>
  getReportRefreshDate(): Promise<string>
}

const MB = 1_048_576
const GB = 1024 * MB
const ONE_DRIVE_CAP_BYTES = 1024 * GB

const MOCK_REFRESH_DATE = '2026-08-30'

const TEMPLATES = ['Team Site', 'Group', 'Team Channel', 'Site Page Publishing', 'Publishing Site']

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
  let word = Math.imul(seed + 1, 2654435761) >>> 0
  let hex = ''
  for (let block = 0; block < 4; block++) {
    word ^= word << 13
    word ^= word >>> 17
    word ^= word << 5
    word >>>= 0
    hex += word.toString(16).padStart(8, '0').toUpperCase()
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
    let mb = 100 + ((i * 37) % 3900)
    if (i % 250 === 0) mb += 100 * 1024
    out.push({
      pool: 'SharePoint',
      id: `gen-${i}`,
      name: concealed ? undefined : `Team ${i}`,
      url: concealed ? '' : `https://contoso.sharepoint.com/sites/team-${i}`,
      ownerDisplayName: concealed ? hashName(i) : `Owner ${i}`,
      storageUsedBytes: mb * MB,
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
    ['site-1', 'marketing', 'Marketing', 'Alice Marketing', 50, 4200, 380, 'Team Site'],
    ['site-2', 'engineering', 'Engineering', 'Bob Engineering', 150, 18_900, 2140, 'Team Channel'],
    ['site-3', 'hr', 'Human Resources', 'Carol HR', 10, 1350, 96, 'Group'],
    ['site-4', 'sales', 'Sales', 'Dan Sales', 80, 7640, 905, 'Team Site'],
  ] as const
  return named.map(([id, slug, name, owner, gb, files, active, template], i) => ({
    pool: 'SharePoint' as const,
    id,
    name: concealed ? undefined : name,
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
    const nearCap = i % 200 === 0
    const mb = nearCap ? (950 + (i % 40)) * 1024 : 200 + ((i * 13) % 8000)
    out.push({
      pool: 'OneDrive',
      id: concealed ? hashName(2000 + i) : `user${i}@contoso.com`,
      url: concealed ? '' : `https://contoso-my.sharepoint.com/personal/user${i}`,
      ownerDisplayName: concealed ? hashName(3000 + i) : `User ${i}`,
      storageUsedBytes: mb * MB,
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
  {
    skuId: 'sku-e5',
    skuPartNumber: 'SPE_E5',
    consumed: 184,
    enabled: 200,
    available: 16,
    servicePlans: ['SHAREPOINTENTERPRISE', 'SHAREPOINTWAC', 'EXCHANGE_S_ENTERPRISE'],
  },
  {
    skuId: 'sku-e3',
    skuPartNumber: 'SPE_E3',
    consumed: 412,
    enabled: 500,
    available: 88,
    servicePlans: ['SHAREPOINTENTERPRISE', 'SHAREPOINTWAC', 'EXCHANGE_S_ENTERPRISE'],
  },
  {
    skuId: 'sku-f3',
    skuPartNumber: 'SPE_F3',
    consumed: 95,
    enabled: 150,
    available: 55,
    servicePlans: ['SHAREPOINTDESKLESS', 'SHAREPOINTWAC'],
  },
  {
    skuId: 'sku-flow',
    skuPartNumber: 'FLOW_FREE',
    consumed: 116,
    enabled: 10_000,
    available: 9884,
    servicePlans: ['FLOW_P2_VIRAL'],
  },
]

const org: OrgInfo = {
  displayName: 'Contoso Ltd',
  verifiedDomain: 'contoso.onmicrosoft.com',
  country: 'GB',
}

const HEALTHY_SHAREPOINT_CURVE = [0.881, 0.905, 0.931, 0.951, 0.98, 1]
const HEALTHY_ONEDRIVE_CURVE = [0.921, 0.939, 0.952, 0.969, 0.982, 1]
const OVER_ENTITLEMENT_CURVE = [0.825, 0.857, 0.894, 0.927, 0.963, 1]
const OVER_ENTITLEMENT_SCALE = 1.7

function sumBytes(rows: StorageRow[]): number {
  return rows.reduce((total, row) => total + row.storageUsedBytes, 0)
}

function trendFor(rows: StorageRow[], curve: number[]): UsagePoint[] {
  const latest = sumBytes(rows)
  return series(curve.map((fraction) => Math.round(latest * fraction)))
}

function scaled(rows: StorageRow[], factor: number): StorageRow[] {
  return rows.map((row) => ({ ...row, storageUsedBytes: Math.round(row.storageUsedBytes * factor) }))
}

interface ScenarioData {
  sites: StorageRow[]
  directory: SiteDirectory
  drives: StorageRow[]
  sharePointTrend: UsagePoint[]
  oneDriveTrend: UsagePoint[]
}

function splitDirectory(rows: StorageRow[]): Pick<ScenarioData, 'sites' | 'directory'> {
  const directory: SiteDirectory = new Map()
  const sites = rows.map(({ name, ...row }) => {
    if (name && !row.isDeleted) directory.set(row.id.toLowerCase(), { name, url: row.url })
    return row
  })
  return { sites, directory }
}

function scenarioData(scenario: MockScenario): ScenarioData {
  const concealed = scenario === 'concealed'
  const baseSites = [...namedSites(concealed), ...generateSites(2500, concealed)]
  const { sites, directory } = splitDirectory(
    scenario === 'over-entitlement' ? scaled(baseSites, OVER_ENTITLEMENT_SCALE) : baseSites,
  )
  const drives = generateDrives(400, concealed)
  const sharePointCurve =
    scenario === 'over-entitlement' ? OVER_ENTITLEMENT_CURVE : HEALTHY_SHAREPOINT_CURVE
  const months = scenario === 'short-history' ? 2 : 6

  return {
    sites,
    directory,
    drives,
    sharePointTrend: trendFor(sites, sharePointCurve.slice(-months)),
    oneDriveTrend: trendFor(drives, HEALTHY_ONEDRIVE_CURVE.slice(-months)),
  }
}

export function createMockDataSource(scenario: MockScenario = 'healthy'): DataSource {
  const data = scenarioData(scenario)
  return {
    getSites: async () => data.sites,
    getSiteDetails: async (ids) => {
      const found: SiteDirectory = new Map()
      for (const id of ids) {
        const site = data.directory.get(id.toLowerCase())
        if (site) found.set(id.toLowerCase(), site)
      }
      return found
    },
    getSiteDirectory: async () => data.directory,
    getDrives: async () => data.drives,
    getSharePointTrend: async () => data.sharePointTrend,
    getOneDriveTrend: async () => data.oneDriveTrend,
    getLicenses: async () => licenses,
    getOrg: async () => org,
    getReportRefreshDate: async () => MOCK_REFRESH_DATE,
  }
}
