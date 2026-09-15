import type { BatchResponse } from '@/clients/graphClient'
import type { StorageRow } from '@/types/storage'

export interface RawDirectorySite {
  id?: string
  displayName?: string
  webUrl?: string
}

export interface DirectorySite {
  name: string
  url: string
}

export type SiteDirectory = Map<string, DirectorySite>

const HTTP_OK = 200

export function siteDetailsPath(siteId: string): string {
  return `/sites/${encodeURIComponent(siteId)}?$select=id,displayName,webUrl`
}

export function parseSiteDetails(
  ids: string[],
  responses: BatchResponse<RawDirectorySite>[],
): SiteDirectory {
  const directory: SiteDirectory = new Map()
  ids.forEach((id, i) => {
    const response = responses[i]
    if (response?.status !== HTTP_OK || !response.body) return
    directory.set(id.toLowerCase(), {
      name: response.body.displayName ?? '',
      url: response.body.webUrl ?? '',
    })
  })
  return directory
}

export function unresolvedSiteIds(rows: StorageRow[]): string[] {
  return rows.filter((row) => row.pool === 'SharePoint' && !row.name).map((row) => row.id)
}

export function withSiteDirectory(rows: StorageRow[], directory: SiteDirectory): StorageRow[] {
  if (directory.size === 0) return rows
  return rows.map((row) => {
    const site = directory.get(row.id.toLowerCase())
    if (!site) return row
    return {
      ...row,
      name: site.name || row.name,
      url: row.url || site.url,
    }
  })
}
