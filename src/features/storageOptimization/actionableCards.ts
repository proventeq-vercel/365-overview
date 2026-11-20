import type { StorageOverview } from '@/types/storage'

const BYTES_PER_GB = 1_073_741_824
const MONTHS_PER_YEAR = 12
const CENTS = 100

export const FORECAST_WINDOW_MONTHS = 24

export type KpiCardId =
  | 'storageUsed'
  | 'overEntitlement'
  | 'forecastExhaustion'
  | 'costOfNothing'
  | 'archiveCandidates'
  | 'deletedButBilling'

export const annualCost = (bytes: number, ratePerGb: number): number =>
  Math.round((bytes / BYTES_PER_GB) * ratePerGb * MONTHS_PER_YEAR * CENTS) / CENTS

export const isOverEntitlement = (overview: StorageOverview): boolean =>
  (overview.sharePoint.overageBytes ?? 0) > 0

export const exhaustsWithinWindow = (overview: StorageOverview): boolean => {
  const months = overview.growth.forecastMonthsToExhaustion
  return months !== null && months <= FORECAST_WINDOW_MONTHS && !isOverEntitlement(overview)
}

export const costsToDoNothing = (overview: StorageOverview): boolean =>
  overview.cost.applies && overview.cost.cumulativeYear3 > 0

export const hasArchiveCandidates = (overview: StorageOverview): boolean =>
  overview.archive.applies && overview.archive.siteCount > 0

export type DeletedStorageBilling =
  | 'billed'
  | 'underEntitlement'
  | 'atEntitlement'
  | 'entitlementUnknown'
  | 'outsidePool'

export interface DeletedStorageCard {
  bytes: number
  siteCount: number
  oneDriveCount: number
  billing: DeletedStorageBilling
  billableBytes: number
  headroomBytes: number
}

const deletedBilling = (siteBytes: number, billableBytes: number, sharePoint: StorageOverview['sharePoint']) => {
  if (siteBytes <= 0) return 'outsidePool'
  if (sharePoint.entitledBytes === null) return 'entitlementUnknown'
  if (billableBytes > 0) return 'billed'
  return (sharePoint.remainingBytes ?? 0) > 0 ? 'underEntitlement' : 'atEntitlement'
}

export const deletedStorageCard = (overview: StorageOverview): DeletedStorageCard | null => {
  const sites = overview.sharePoint.deletedButBilling
  const drives = overview.oneDrive.deletedButBilling
  const bytes = sites.bytes + drives.bytes
  if (bytes <= 0) return null
  const billableBytes = Math.min(sites.bytes, overview.sharePoint.overageBytes ?? 0)
  const billing: DeletedStorageBilling = deletedBilling(sites.bytes, billableBytes, overview.sharePoint)
  return {
    bytes,
    siteCount: sites.count,
    oneDriveCount: drives.count,
    billing,
    billableBytes: billing === 'billed' ? billableBytes : 0,
    headroomBytes: Math.max(0, overview.sharePoint.remainingBytes ?? 0),
  }
}

const CONDITIONAL_CARDS: { id: KpiCardId; applies: (overview: StorageOverview) => boolean }[] = [
  { id: 'overEntitlement', applies: isOverEntitlement },
  { id: 'forecastExhaustion', applies: exhaustsWithinWindow },
  { id: 'costOfNothing', applies: costsToDoNothing },
  { id: 'archiveCandidates', applies: hasArchiveCandidates },
  { id: 'deletedButBilling', applies: (overview) => deletedStorageCard(overview) !== null },
]

export const actionableCards = (overview: StorageOverview): KpiCardId[] => [
  'storageUsed',
  ...CONDITIONAL_CARDS.filter(({ applies }) => applies(overview)).map(({ id }) => id),
]
