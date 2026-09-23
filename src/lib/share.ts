import type { StorageRow } from '@/types/storage'

export function shareOf(bytes: number, totalBytes: number): number {
  return totalBytes > 0 ? bytes / totalBytes : 0
}

export function capacityRatio(row: Pick<StorageRow, 'storageUsedBytes' | 'allocatedBytes'>): number | null {
  return row.allocatedBytes !== undefined && row.allocatedBytes > 0
    ? row.storageUsedBytes / row.allocatedBytes
    : null
}
