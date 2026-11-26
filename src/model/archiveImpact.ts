import { costOverTime, type CostOverTime } from '@/lib/cost'
import { cleanUpOutlook, growthRows, type CleanUpOutlook } from '@/lib/forecast'
import type { StorageOverview, StorageRow } from '@/types/storage'
import { sumBytes } from './storageOverview'

export interface ArchiveImpact {
  picked: StorageRow[]
  archivedBytes: number
  removableBytes: number
  trendRows: Record<string, unknown>[]
  cost: CostOverTime
  outlook: CleanUpOutlook
  cleansUp: boolean
}

export function buildArchiveImpact(
  overview: StorageOverview,
  pickedIds: ReadonlySet<string>,
): ArchiveImpact {
  const { growth, sharePoint, cost, archive } = overview
  const picked = archive.sites.filter((site) => pickedIds.has(site.id))
  const archivedBytes = sumBytes(picked)
  return {
    picked,
    archivedBytes,
    removableBytes: growth.afterCleanUp.removableBytes + archivedBytes,
    trendRows: growthRows(growth.points, archivedBytes),
    cost: costOverTime(growth.points, sharePoint.entitledBytes, cost.ratePerGb, archivedBytes),
    outlook:
      archivedBytes > 0
        ? cleanUpOutlook(growth.points, archivedBytes, sharePoint.entitledBytes)
        : {
            endBytes: growth.afterCleanUp.endBytes,
            staysUnderEntitlement: growth.afterCleanUp.staysUnderEntitlement,
          },
    cleansUp: growth.afterCleanUp.applies && growth.afterCleanUp.removableBytes > 0,
  }
}
