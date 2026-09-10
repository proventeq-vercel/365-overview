import type { LicenseSku } from '@/types/reports'

export const GB_IN_BYTES = 1_073_741_824

export const BASE_ENTITLEMENT_BYTES = 1024 * GB_IN_BYTES

const DEFAULT_CONTRIBUTION_GB = 10
const ONEDRIVE_STANDALONE_CONTRIBUTION_GB = 0.5
const FRONTLINE_CONTRIBUTION_GB = 0

const FRONTLINE_MARKERS = [
  'SPE_F1',
  'SPE_F5',
  'DESKLESS',
  'M365_F1',
  'F1_COMM',
  '_F3',
  'FIRSTLINE',
]
const ONEDRIVE_STANDALONE_MARKERS = [
  'ONEDRIVESTANDARD',
  'ONEDRIVEENTERPRISE',
  'ONEDRIVEBASIC',
]

export function contributionGbFor(skuPartNumber: string): number {
  const sku = skuPartNumber.toUpperCase()
  if (FRONTLINE_MARKERS.some((marker) => sku.includes(marker))) {
    return FRONTLINE_CONTRIBUTION_GB
  }
  if (ONEDRIVE_STANDALONE_MARKERS.some((marker) => sku.includes(marker))) {
    return ONEDRIVE_STANDALONE_CONTRIBUTION_GB
  }
  return DEFAULT_CONTRIBUTION_GB
}

export function estimateEntitlementBytes(skus: LicenseSku[]): number {
  const perLicenceGb = skus.reduce(
    (sum, sku) => sum + sku.enabled * contributionGbFor(sku.skuPartNumber),
    0,
  )
  return BASE_ENTITLEMENT_BYTES + perLicenceGb * GB_IN_BYTES
}
