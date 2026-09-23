import type { LicenseSku, OrgInfo, UsagePoint } from '../types/reports'
import type { StorageRow } from '../types/storage'
import type { SiteDirectory } from '../reports/siteDirectory'

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
