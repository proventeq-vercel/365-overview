import { storageCostAnnual } from '@/lib/cost'
import type { StorageOverview } from '@/types/storage'

export const FORECAST_CARD_MONTHS = 24

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
  billableAnnualCost: number
  headroomBytes: number
}

export type KpiCard =
  | { id: 'storageUsed' }
  | { id: 'overEntitlement'; overageBytes: number; annualCost: number }
  | { id: 'forecastExhaustion'; exhaustionDate: string }
  | { id: 'costOfNothing' }
  | { id: 'archiveCandidates' }
  | { id: 'deletedButBilling'; deleted: DeletedStorageCard }

export type KpiCardId = KpiCard['id']

const overageOf = (overview: StorageOverview): number | null => {
  const { overageBytes } = overview.sharePoint
  return overageBytes !== null && overageBytes > 0 ? overageBytes : null
}

const overEntitlementCard = (overview: StorageOverview): KpiCard | null => {
  const overageBytes = overageOf(overview)
  if (overageBytes === null) return null
  return { id: 'overEntitlement', overageBytes, annualCost: storageCostAnnual(overageBytes, overview.cost.ratePerGb) }
}

const forecastExhaustionCard = (overview: StorageOverview): KpiCard | null => {
  const { forecastMonthsToExhaustion: months, forecastExhaustionDate: exhaustionDate } = overview.growth
  if (exhaustionDate === null) return null
  if (months === null || months > FORECAST_CARD_MONTHS) return null
  return { id: 'forecastExhaustion', exhaustionDate }
}

const costOfNothingCard = (overview: StorageOverview): KpiCard | null =>
  overview.cost.applies && overview.cost.cumulativeYear3 > 0 ? { id: 'costOfNothing' } : null

const archiveCandidatesCard = (overview: StorageOverview): KpiCard | null =>
  overview.archive.applies && overview.archive.siteCount > 0 && overview.archive.bytes > 0
    ? { id: 'archiveCandidates' }
    : null

const deletedBilling = (
  siteBytes: number,
  billableBytes: number,
  sharePoint: StorageOverview['sharePoint'],
): DeletedStorageBilling => {
  if (siteBytes <= 0) return 'outsidePool'
  if (sharePoint.entitledBytes === null || sharePoint.remainingBytes === null) return 'entitlementUnknown'
  if (billableBytes > 0) return 'billed'
  return sharePoint.remainingBytes > 0 ? 'underEntitlement' : 'atEntitlement'
}

export const deletedStorageCard = (overview: StorageOverview): DeletedStorageCard | null => {
  if (!overview.sharePoint.siteReportRead || !overview.oneDrive.accountReportRead) return null
  const sites = overview.sharePoint.deletedButBilling
  const drives = overview.oneDrive.deletedButBilling
  const bytes = sites.bytes + drives.bytes
  if (bytes <= 0) return null
  const overage = overageOf(overview)
  const billableBytes = overage === null ? 0 : Math.min(sites.bytes, overage)
  const billing = deletedBilling(sites.bytes, billableBytes, overview.sharePoint)
  const remaining = overview.sharePoint.remainingBytes
  return {
    bytes,
    siteCount: sites.bytes > 0 ? sites.count : 0,
    oneDriveCount: drives.bytes > 0 ? drives.count : 0,
    billing,
    billableBytes,
    billableAnnualCost: storageCostAnnual(billableBytes, overview.cost.ratePerGb),
    headroomBytes: billing === 'underEntitlement' && remaining !== null ? remaining : 0,
  }
}

const deletedButBillingCard = (overview: StorageOverview): KpiCard | null => {
  const deleted = deletedStorageCard(overview)
  return deleted === null ? null : { id: 'deletedButBilling', deleted }
}

const CONDITIONAL_CARDS: ((overview: StorageOverview) => KpiCard | null)[] = [
  overEntitlementCard,
  forecastExhaustionCard,
  costOfNothingCard,
  archiveCandidatesCard,
  deletedButBillingCard,
]

export const actionableCards = (overview: StorageOverview): KpiCard[] => [
  { id: 'storageUsed' },
  ...CONDITIONAL_CARDS.map((build) => build(overview)).filter((card) => card !== null),
]
