import type { BatchResponse } from '@/clients/graphClient'
import type { StorageRow } from '@/types/storage'

export interface RawDirectorySite {
  id?: string
  displayName?: string
  webUrl?: string
}

export interface RawDeltaSite extends RawDirectorySite {
  name?: string
}

export interface DirectorySite {
  name: string
  url: string
}

export type SiteDirectory = Map<string, DirectorySite>

const HTTP_OK = 200

export const SITE_DIRECTORY_PAGE_SIZE = 500
export const SITE_DIRECTORY_PAGE_LIMIT = 10

export function siteDetailsPath(siteId: string): string {
  return `/sites/${encodeURIComponent(siteId)}?$select=id,displayName,webUrl`
}

export function siteDirectoryPath(): string {
  return `/sites/delta?$select=id,name,displayName,webUrl&$top=${SITE_DIRECTORY_PAGE_SIZE}`
}

export function siteCollectionIdOf(compositeId: string): string | null {
  const [, siteCollectionId] = compositeId.split(',')
  return siteCollectionId ? siteCollectionId.toLowerCase() : null
}

function rootmost(a: DirectorySite, b: DirectorySite): DirectorySite {
  if (!a.url) return b
  if (!b.url) return a
  return b.url.length < a.url.length ? b : a
}

export function parseDeltaSites(sites: RawDeltaSite[]): SiteDirectory {
  const directory: SiteDirectory = new Map()
  for (const site of sites) {
    const id = site.id ? siteCollectionIdOf(site.id) : null
    if (!id) continue
    const entry = { name: site.displayName || site.name || '', url: site.webUrl ?? '' }
    const existing = directory.get(id)
    directory.set(id, existing ? rootmost(existing, entry) : entry)
  }
  return directory
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
