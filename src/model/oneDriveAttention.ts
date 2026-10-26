import { inactiveSince, isInactiveSince } from '@/lib/archive'
import type { OneDriveLicences } from '@/reports/activeUsers'
import {
  INACTIVE_DRIVE_BANDS,
  type DriveGroup,
  type InactiveDriveBand,
  type OneDriveAttention,
  type StorageRow,
} from '@/types/storage'

export interface AttentionInputs {
  drives: StorageRow[]
  licences: OneDriveLicences | null
  reportRefreshDate: string
  inactiveYears: number
  now: Date
}

const BAND_YEARS: Record<InactiveDriveBand, (years: number) => { fromYears: number | null; toYears: number | null }> = {
  firstYear: (years) => ({ fromYears: years, toYears: years + 1 }),
  secondYear: (years) => ({ fromYears: years + 1, toYears: years + 2 }),
  older: (years) => ({ fromYears: years + 2, toYears: null }),
  never: () => ({ fromYears: null, toYears: null }),
}

const groupOf = (rows: StorageRow[]): DriveGroup => ({
  count: rows.length,
  bytes: rows.reduce((total, row) => total + row.storageUsedBytes, 0),
})

export function oneDriveAttention(inputs: AttentionInputs): OneDriveAttention {
  const { drives, licences, reportRefreshDate, inactiveYears, now } = inputs
  const since = inactiveSince(reportRefreshDate, inactiveYears, now)
  const yearBefore = inactiveSince(reportRefreshDate, inactiveYears + 1, now)
  const twoYearsBefore = inactiveSince(reportRefreshDate, inactiveYears + 2, now)

  const live = drives.filter((drive) => !drive.isDeleted)
  const unlicensed = licences === null ? [] : live.filter((drive) => licences.get(drive.id.toLowerCase()) === false)
  const billable = new Set(unlicensed)
  const inactive = live.filter(
    (drive) => !billable.has(drive) && (drive.lastActivityDate === null || isInactiveSince(drive, since)),
  )

  const bandOf = (drive: StorageRow): InactiveDriveBand => {
    if (drive.lastActivityDate === null) return 'never'
    if (!isInactiveSince(drive, yearBefore)) return 'firstYear'
    if (!isInactiveSince(drive, twoYearsBefore)) return 'secondYear'
    return 'older'
  }

  return {
    inactiveYears,
    inactiveSince: since,
    inactive: {
      ...groupOf(inactive),
      bands: INACTIVE_DRIVE_BANDS.map((band) => ({
        band,
        ...BAND_YEARS[band](inactiveYears),
        ...groupOf(inactive.filter((drive) => bandOf(drive) === band)),
      })),
    },
    unlicensed: licences === null ? null : groupOf(unlicensed),
  }
}
