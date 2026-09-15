import type { SiteDirectory } from '@/reports/siteDirectory'
import type { StorageRow } from '@/types/storage'

export interface SearchIndex {
  keys: string[]
  ids: string[]
}

export type SortDirection = 'asc' | 'desc'

export function searchKey(row: StorageRow): string {
  return `${row.name ?? ''}\n${row.url}\n${row.ownerDisplayName}\n${row.id}`.toLowerCase()
}

export function buildSearchIndex(rows: StorageRow[]): SearchIndex {
  const keys = new Array<string>(rows.length)
  const ids = new Array<string>(rows.length)
  rows.forEach((row, i) => {
    keys[i] = searchKey(row)
    ids[i] = row.id.toLowerCase()
  })
  return { keys, ids }
}

export function sortOrder(
  rows: StorageRow[],
  sortValue: (row: StorageRow) => number,
  direction: SortDirection,
): number[] {
  const values = rows.map(sortValue)
  const order = rows.map((_, i) => i)
  const sign = direction === 'asc' ? 1 : -1
  return order.sort((a, b) => sign * (values[a] - values[b]))
}

export function normaliseQuery(search: string): string {
  return search.trim().toLowerCase()
}

export function knownSiteHits(known: SiteDirectory, query: string): Set<string> {
  const hits = new Set<string>()
  if (!query) return hits
  known.forEach((site, id) => {
    if (site.name.toLowerCase().includes(query) || site.url.toLowerCase().includes(query)) {
      hits.add(id)
    }
  })
  return hits
}

export function searchOrder(
  order: number[],
  index: SearchIndex,
  query: string,
  known: SiteDirectory,
): number[] {
  if (!query) return order
  const hits = knownSiteHits(known, query)
  const { keys, ids } = index
  const matched = new Uint8Array(keys.length)
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].includes(query) || (hits.size > 0 && hits.has(ids[i]))) matched[i] = 1
  }
  return order.filter((i) => matched[i] === 1)
}
