import type { StorageRow } from '@/types/storage'

export type NamedRow = Pick<StorageRow, 'id' | 'name' | 'url'>

const lastUrlSegment = (url: string): string => url.replace(/\/$/, '').split('/').pop() ?? ''

export function rowName(row: NamedRow): string {
  return row.name || lastUrlSegment(row.url) || row.id
}
