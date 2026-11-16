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

export const deletedBillableBytes = (overview: StorageOverview): number =>
  Math.min(overview.sharePoint.deletedButBilling.bytes, overview.sharePoint.overageBytes ?? 0)

const CONDITIONAL_CARDS: { id: KpiCardId; applies: (overview: StorageOverview) => boolean }[] = [
  { id: 'overEntitlement', applies: isOverEntitlement },
  { id: 'forecastExhaustion', applies: exhaustsWithinWindow },
  { id: 'costOfNothing', applies: costsToDoNothing },
  { id: 'archiveCandidates', applies: hasArchiveCandidates },
  { id: 'deletedButBilling', applies: (overview) => deletedBillableBytes(overview) > 0 },
]

export const actionableCards = (overview: StorageOverview): KpiCardId[] => [
  'storageUsed',
  ...CONDITIONAL_CARDS.filter(({ applies }) => applies(overview)).map(({ id }) => id),
]
