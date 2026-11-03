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
  const bytes: Partial<Record<StorageSegmentKey, number>> = {
    sharePoint: Math.max(0, sharePointUsedBytes - teamsBytes - inactiveBytes - deletedSiteBytes),
    teams: teamsBytes,
    deleted: deletedSiteBytes,
    inactive: inactiveBytes,
    ...(freeBytes === null ? {} : { free: freeBytes }),
  }
  const present = STORAGE_SEGMENTS.flatMap((key) => {
    const value = bytes[key]
    return value === undefined ? [] : [{ key, value }]
  })
  const totalBytes = present.reduce((total, { value }) => total + value, 0)
  return {
    segments: present
      .filter(({ key }) => siteFiguresRead || !SITE_REPORT_SEGMENTS.has(key))
      .map(({ key, value }) => ({ key, bytes: value, share: totalBytes === 0 ? 0 : value / totalBytes })),
    totalBytes,
    deletedCount,
  }
}
