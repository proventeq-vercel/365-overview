import type { LicenseSku } from '@/types/reports'

export const GB_IN_BYTES = 1_073_741_824

export const BASE_ENTITLEMENT_BYTES = 1024 * GB_IN_BYTES
export const PER_LICENCE_STORAGE_BYTES = 10 * GB_IN_BYTES
export const STORAGE_ADD_ON_BYTES_PER_UNIT = GB_IN_BYTES
export const ONEDRIVE_STANDALONE_BYTES_PER_LICENCE = GB_IN_BYTES / 2

const ONEDRIVE_STANDARD_BYTES_PER_USER = 1024 * GB_IN_BYTES
const ONEDRIVE_RAISED_BYTES_PER_USER = 5 * ONEDRIVE_STANDARD_BYTES_PER_USER
const ONEDRIVE_FRONTLINE_BYTES_PER_USER = 2 * GB_IN_BYTES
const ONEDRIVE_RAISE_MIN_LICENCES = 5

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

const ONEDRIVE_RAISABLE_PLANS = new Set([
  'SHAREPOINTENTERPRISE',
  'SHAREPOINTENTERPRISE_GOV',
  'SHAREPOINTENTERPRISE_MIDMARKET',
  'ONEDRIVEENTERPRISE',
])

const ONEDRIVE_STANDARD_PLANS = new Set(['SHAREPOINTSTANDARD', 'ONEDRIVESTANDARD'])

const ONEDRIVE_FRONTLINE_PLANS = new Set(['SHAREPOINTDESKLESS', 'SHAREPOINTDESKLESS_GOV'])

const COMPANION_PLANS = new Set([
  'PROJECT_P1',
  'PROJECT_ESSENTIALS',
  'PROJECT_ESSENTIALS_GOV',
  'PROJECT_PROFESSIONAL',
  'PROJECT_CLIENT_SUBSCRIPTION',
  'PROJECT_CLIENT_SUBSCRIPTION_GOV',
  'SHAREPOINT_PROJECT',
  'SHAREPOINT_PROJECT_GOV',
  'VISIO_CLIENT_SUBSCRIPTION',
  'VISIOONLINE',
  'POWERAPPS_DYN_APPS',
])

const EDUCATION_PLAN_SUFFIX = '_EDU'

type OneDriveTier = 'raisable' | 'standard' | 'frontline'

function oneDriveTier(servicePlans: string[]): OneDriveTier | null {
  const plans = servicePlans.map((plan) => plan.trim().toUpperCase())
  if (plans.some((plan) => COMPANION_PLANS.has(plan) || plan.endsWith(EDUCATION_PLAN_SUFFIX))) return null
  if (plans.some((plan) => ONEDRIVE_RAISABLE_PLANS.has(plan))) return 'raisable'
  if (plans.some((plan) => ONEDRIVE_STANDARD_PLANS.has(plan))) return 'standard'
  if (plans.some((plan) => ONEDRIVE_FRONTLINE_PLANS.has(plan))) return 'frontline'
  return null
}

export function oneDriveBytesPerUser(skus: LicenseSku[]): number | null {
  const licencesByTier = new Map<OneDriveTier, number>()
  for (const sku of skus) {
    const tier = oneDriveTier(sku.servicePlans)
    if (tier === null || !(sku.enabled > 0)) continue
    licencesByTier.set(tier, (licencesByTier.get(tier) ?? 0) + sku.enabled)
  }
  const raisable = licencesByTier.get('raisable') ?? 0
  if (raisable >= ONEDRIVE_RAISE_MIN_LICENCES) return ONEDRIVE_RAISED_BYTES_PER_USER
  if (raisable > 0 || licencesByTier.has('standard')) return ONEDRIVE_STANDARD_BYTES_PER_USER
  if (licencesByTier.has('frontline')) return ONEDRIVE_FRONTLINE_BYTES_PER_USER
  return null
}
