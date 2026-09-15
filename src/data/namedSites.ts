import { unresolvedSiteIds, withSiteDirectory } from '../reports/siteDirectory'
import type { StorageRow } from '../types/storage'
import type { DataSource } from './fixtures'

export const NAMED_UP_FRONT = 50

export function topSitesByStorage(sites: StorageRow[], limit = NAMED_UP_FRONT): StorageRow[] {
  return sites
    .filter((site) => !site.isDeleted)
    .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes)
    .slice(0, limit)
}

export async function nameTopSites(
  source: Pick<DataSource, 'getSiteDetails'>,
  sites: StorageRow[],
): Promise<StorageRow[]> {
  const ids = unresolvedSiteIds(topSitesByStorage(sites))
  if (ids.length === 0) return sites
  return withSiteDirectory(sites, await source.getSiteDetails(ids))
}
