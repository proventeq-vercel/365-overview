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

const KNOWN_NON_CONTRIBUTING_PLANS = new Set([
  'SHAREPOINTWAC',
  'SHAREPOINTWAC_EDU',
  'SHAREPOINTWAC_DEVELOPER',
  'SHAREPOINTWAC_GOV',
  'SHAREPOINTDESKLESS',
  'SHAREPOINTDESKLESS_GOV',
  'SHAREPOINTLITE',
])

export interface EntitlementEstimate {
  entitlementBytes: number
  unmatchedPlans: string[]
}

export function skuStorageBytesPerLicence(servicePlans: string[]): number {
  const plans = servicePlans.map((plan) => plan.trim().toUpperCase()).filter((plan) => plan !== '')
  if (plans.includes(STORAGE_ADD_ON_PLAN)) return STORAGE_ADD_ON_BYTES_PER_UNIT
  if (plans.some((plan) => FULL_STORAGE_PLANS.has(plan))) return PER_LICENCE_STORAGE_BYTES
  if (plans.some((plan) => ONEDRIVE_STANDALONE_PLANS.has(plan))) {
    return ONEDRIVE_STANDALONE_BYTES_PER_LICENCE
  }
  return 0
}

export function unmatchedSharePointPlans(servicePlans: string[]): string[] {
  return servicePlans
    .map((plan) => plan.trim().toUpperCase())
    .filter(
      (plan) =>
        plan.startsWith('SHAREPOINT') &&
        plan !== STORAGE_ADD_ON_PLAN &&
        !FULL_STORAGE_PLANS.has(plan) &&
        !KNOWN_NON_CONTRIBUTING_PLANS.has(plan),
    )
}

export function estimateEntitlement(skus: LicenseSku[]): EntitlementEstimate {
  const unmatched = new Set<string>()
  let entitlementBytes = BASE_ENTITLEMENT_BYTES
  for (const sku of skus) {
    if (sku.enabled <= 0) continue
    entitlementBytes += skuStorageBytesPerLicence(sku.servicePlans) * sku.enabled
    for (const plan of unmatchedSharePointPlans(sku.servicePlans)) unmatched.add(plan)
  }
  return { entitlementBytes, unmatchedPlans: [...unmatched].sort() }
}

export function estimateEntitlementBytes(skus: LicenseSku[]): number {
  return estimateEntitlement(skus).entitlementBytes
}
