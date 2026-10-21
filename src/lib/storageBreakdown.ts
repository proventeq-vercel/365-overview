import {
  STORAGE_SEGMENTS,
  type StorageBreakdown,
  type StorageSegmentKey,
} from '@/types/storage'

export interface StorageBreakdownInputs {
  sharePointUsedBytes: number
  oneDriveUsedBytes: number
  teamsBytes: number
  inactiveBytes: number
  deletedSiteBytes: number
  deletedDriveBytes: number
  deletedCount: number
  freeBytes: number | null
}

export function storageBreakdown(inputs: StorageBreakdownInputs): StorageBreakdown {
  const {
    sharePointUsedBytes,
    oneDriveUsedBytes,
    teamsBytes,
    inactiveBytes,
    deletedSiteBytes,
    deletedDriveBytes,
    deletedCount,
    freeBytes,
  } = inputs
  const bytes: Record<StorageSegmentKey, number | null> = {
    sharePoint: Math.max(0, sharePointUsedBytes - teamsBytes - inactiveBytes - deletedSiteBytes),
    oneDrive: Math.max(0, oneDriveUsedBytes - deletedDriveBytes),
    teams: teamsBytes,
    deleted: deletedSiteBytes + deletedDriveBytes,
    inactive: inactiveBytes,
    free: freeBytes,
  }
  const totalBytes = STORAGE_SEGMENTS.reduce((total, key) => total + (bytes[key] ?? 0), 0)
  return {
    segments: STORAGE_SEGMENTS.map((key) => {
      const value = bytes[key]
      return { key, bytes: value, share: value === null || totalBytes === 0 ? 0 : value / totalBytes }
    }),
    totalBytes,
    deletedCount,
  }
}
