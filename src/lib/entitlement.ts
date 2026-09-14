import type { LicenseSku } from '@/types/reports'

export const GB_IN_BYTES = 1_073_741_824

export const BASE_ENTITLEMENT_BYTES = 1024 * GB_IN_BYTES
export const PER_LICENCE_STORAGE_BYTES = 10 * GB_IN_BYTES
export const STORAGE_ADD_ON_BYTES_PER_UNIT = GB_IN_BYTES
export const ONEDRIVE_STANDALONE_BYTES_PER_LICENCE = GB_IN_BYTES / 2

const STORAGE_ADD_ON_PLAN = 'SHAREPOINTSTORAGE'

const FULL_STORAGE_PLANS = new Set([
  'SHAREPOINTSTANDARD',
  'SHAREPOINTENTERPRISE',
  'SHAREPOINTENTERPRISE_EDU',
  'SHAREPOINTSTANDARD_EDU',
  'SHAREPOINTENTERPRISE_MIDMARKET',
  'SHAREPOINTENTERPRISE_GOV',
  'SHAREPOINTSTANDARD_GOV',
  'VISIOCLIENT',
  'VISIO_CLIENT_SUBSCRIPTION',
  'VISIOONLINE_PLAN1',
  'PROJECT_PROFESSIONAL',
  'PROJECT_PREMIUM',
  'PROJECTPROFESSIONAL',
  'PROJECTPREMIUM',
])

const ONEDRIVE_STANDALONE_PLANS = new Set([
  'ONEDRIVESTANDARD',
  'ONEDRIVEENTERPRISE',
  'WACONEDRIVESTANDARD',
  'WACONEDRIVEENTERPRISE',
])

export function skuStorageBytesPerLicence(servicePlans: string[]): number {
  const plans = servicePlans.map((plan) => plan.trim().toUpperCase()).filter((plan) => plan !== '')
  if (plans.includes(STORAGE_ADD_ON_PLAN)) return STORAGE_ADD_ON_BYTES_PER_UNIT
  if (plans.some((plan) => FULL_STORAGE_PLANS.has(plan))) return PER_LICENCE_STORAGE_BYTES
  if (plans.some((plan) => ONEDRIVE_STANDALONE_PLANS.has(plan))) {
    return ONEDRIVE_STANDALONE_BYTES_PER_LICENCE
  }
  return 0
}

export function estimateEntitlementBytes(skus: LicenseSku[]): number {
  return skus.reduce(
    (total, sku) => total + skuStorageBytesPerLicence(sku.servicePlans) * sku.enabled,
    BASE_ENTITLEMENT_BYTES,
  )
}
