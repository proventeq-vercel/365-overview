import type { StorageRow } from '@/types/storage'

export function reportedTemplate(row: Pick<StorageRow, 'template'>): string {
  return row.template?.trim() ?? ''
}
