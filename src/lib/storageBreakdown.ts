import {
  STORAGE_SEGMENTS,
  type StorageBreakdown,
  type StorageSegmentKey,
} from '@/types/storage'

const SITE_REPORT_SEGMENTS: ReadonlySet<StorageSegmentKey> = new Set(['teams', 'deleted', 'inactive'])

export interface StorageBreakdownInputs {
  sharePointUsedBytes: number
  teamsBytes: number
  inactiveBytes: number
  deletedSiteBytes: number
  deletedCount: number
  freeBytes: number | null
  siteFiguresRead: boolean
}

export function storageBreakdown(inputs: StorageBreakdownInputs): StorageBreakdown {
  const {
    sharePointUsedBytes,
    teamsBytes,
    inactiveBytes,
    deletedSiteBytes,
    deletedCount,
    freeBytes,
    siteFiguresRead,
  } = inputs
  const bytes: Record<StorageSegmentKey, number | null> = {
    sharePoint: Math.max(0, sharePointUsedBytes - teamsBytes - inactiveBytes - deletedSiteBytes),
    teams: teamsBytes,
    deleted: deletedSiteBytes,
    inactive: inactiveBytes,
    free: freeBytes,
  }
  const totalBytes = STORAGE_SEGMENTS.reduce((total, key) => total + (bytes[key] ?? 0), 0)
  return {
    segments: STORAGE_SEGMENTS.filter(
      (key) => (key !== 'free' || freeBytes !== null) && (siteFiguresRead || !SITE_REPORT_SEGMENTS.has(key)),
    ).map((key) => {
      const value = bytes[key]
      return { key, bytes: value, share: value === null || totalBytes === 0 ? 0 : value / totalBytes }
    }),
    totalBytes,
    deletedCount,
  }
}
