import type { StorageRow } from '@/types/storage'

export type NamedRow = Pick<StorageRow, 'id' | 'url' | 'ownerDisplayName'>

const SHORT_ID_LENGTH = 8

export function rowName(row: NamedRow): string {
  return row.url.replace(/\/$/, '').split('/').pop() || row.ownerDisplayName
}

export function rowDetail(row: NamedRow): string {
  return row.url || row.id
}

export function rowLabel(row: NamedRow): string {
  return row.url ? rowName(row) : `${row.ownerDisplayName} · ${row.id.slice(0, SHORT_ID_LENGTH)}`
}
