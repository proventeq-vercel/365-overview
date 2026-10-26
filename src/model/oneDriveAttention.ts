import { inactiveSince } from '@/lib/archive'
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

const emptyGroup = (): DriveGroup => ({ count: 0, bytes: 0 })

const add = (group: DriveGroup, drive: StorageRow) => {
  group.count += 1
  group.bytes += drive.storageUsedBytes
}

const hasLicence = (licences: OneDriveLicences, drive: StorageRow): boolean =>
  licences.get(drive.id.toLowerCase()) === true

export function oneDriveAttention(inputs: AttentionInputs): OneDriveAttention {
  const { drives, licences, reportRefreshDate, inactiveYears, now } = inputs
  const since = inactiveSince(reportRefreshDate, inactiveYears, now)
  const yearBefore = inactiveSince(reportRefreshDate, inactiveYears + 1, now)
  const twoYearsBefore = inactiveSince(reportRefreshDate, inactiveYears + 2, now)

  const live = drives.filter((drive) => !drive.isDeleted)
  const anyListed = licences !== null && live.some((drive) => licences.has(drive.id.toLowerCase()))
  const usableLicences = licences !== null && (live.length === 0 || anyListed) ? licences : null

  const inactive = emptyGroup()
  const unlicensed = { ...emptyGroup(), notListed: 0 }
  const bands = new Map<InactiveDriveBand, DriveGroup>(INACTIVE_DRIVE_BANDS.map((band) => [band, emptyGroup()]))

  for (const drive of live) {
    if (usableLicences !== null && !hasLicence(usableLicences, drive)) {
      add(unlicensed, drive)
      if (!usableLicences.has(drive.id.toLowerCase())) unlicensed.notListed += 1
      continue
    }
    const last = drive.lastActivityDate
    if (last !== null && last >= since) continue
    add(inactive, drive)
    add(
      bands.get(last === null ? 'never' : last >= yearBefore ? 'firstYear' : last >= twoYearsBefore ? 'secondYear' : 'older')!,
      drive,
    )
  }

  return {
    inactiveYears,
    inactiveSince: since,
    inactive: {
      ...inactive,
      bands: INACTIVE_DRIVE_BANDS.map((band) => ({ band, ...BAND_YEARS[band](inactiveYears), ...bands.get(band)! })),
    },
    unlicensed: usableLicences === null ? null : unlicensed,
  }
}
