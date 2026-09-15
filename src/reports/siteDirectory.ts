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

export function siteCollectionIdOf(compositeId: string): string {
  const parts = compositeId.split(',')
  return (parts.length === 3 ? parts[1] : compositeId).toLowerCase()
}

export function parseSiteDirectory(rows: RawDirectorySite[]): SiteDirectory {
  const directory: SiteDirectory = new Map()
  for (const row of rows) {
    if (!row.id) continue
    directory.set(siteCollectionIdOf(row.id), {
      name: row.displayName ?? '',
      url: row.webUrl ?? '',
    })
  }
  return directory
}

export function withSiteDirectory(rows: StorageRow[], directory: SiteDirectory): StorageRow[] {
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
