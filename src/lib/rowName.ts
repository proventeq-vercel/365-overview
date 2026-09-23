import type { StorageRow } from '@/types/storage'

export type NamedRow = Pick<StorageRow, 'id' | 'name' | 'url' | 'ownerDisplayName'>

const SHORT_ID_LENGTH = 8

const lastUrlSegment = (url: string): string => url.replace(/\/$/, '').split('/').pop() ?? ''

export function rowName(row: NamedRow): string {
  return row.name || lastUrlSegment(row.url) || row.ownerDisplayName
}

function shortId(id: string): string {
  const at = id.indexOf('@')
  return at > 0 ? id.slice(0, at) : id.slice(0, SHORT_ID_LENGTH)
}

export function rowLabel(row: NamedRow): string {
  return row.name || row.url ? rowName(row) : `${row.ownerDisplayName} · ${shortId(row.id)}`
}
