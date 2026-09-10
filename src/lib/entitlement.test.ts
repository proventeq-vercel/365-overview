import { describe, it, expect } from 'vitest'
import type { LicenseSku } from '@/types/reports'
import {
  BASE_ENTITLEMENT_BYTES,
  GB_IN_BYTES,
  SELF_SERVICE_UNIT_SENTINEL,
  contributionGbFor,
  estimateEntitlementBytes,
  isSelfServiceUnitCount,
} from './entitlement'

const sku = (skuPartNumber: string, enabled: number): LicenseSku => ({
  skuId: skuPartNumber,
  skuPartNumber,
  consumed: enabled,
  enabled,
  available: 0,
})

describe('contributionGbFor', () => {
  it('gives 10 GB to a standard enterprise SKU', () => {
    expect(contributionGbFor('ENTERPRISEPACK')).toBe(10)
    expect(contributionGbFor('SPE_E5')).toBe(10)
  })

  it('gives 0 GB to frontline SKUs, which add no per-licence storage', () => {
    expect(contributionGbFor('SPE_F1')).toBe(0)
    expect(contributionGbFor('DESKLESSPACK')).toBe(0)
    expect(contributionGbFor('Microsoft_365_F3')).toBe(0)
  })

  it('gives 0.5 GB to OneDrive standalone SKUs', () => {
    expect(contributionGbFor('WACONEDRIVESTANDARD')).toBe(0.5)
    expect(contributionGbFor('ONEDRIVESTANDARD')).toBe(0.5)
  })

  it('is case-insensitive', () => {
    expect(contributionGbFor('spe_f1')).toBe(0)
    expect(contributionGbFor('waconedrivestandard')).toBe(0.5)
  })

  it('falls back to the 10 GB default for an unrecognised SKU', () => {
    expect(contributionGbFor('SOME_SKU_MICROSOFT_HAS_NOT_SHIPPED_YET')).toBe(10)
  })
})

describe('estimateEntitlementBytes', () => {
  it('is the 1 TiB base when no licences are purchased', () => {
    expect(estimateEntitlementBytes([])).toBe(BASE_ENTITLEMENT_BYTES)
  })

  it('adds 10 GB per purchased licence, not per consumed licence', () => {
    const skus = [{ ...sku('ENTERPRISEPACK', 100), consumed: 40 }]
    expect(estimateEntitlementBytes(skus)).toBe(
      BASE_ENTITLEMENT_BYTES + 100 * 10 * GB_IN_BYTES,
    )
  })

  it('sums mixed SKUs at their own rates', () => {
    const skus = [
      sku('ENTERPRISEPACK', 100),
      sku('SPE_F1', 500),
      sku('WACONEDRIVESTANDARD', 200),
    ]
    expect(estimateEntitlementBytes(skus)).toBe(
      BASE_ENTITLEMENT_BYTES + 1100 * GB_IN_BYTES,
    )
  })

  it('uses binary GB, matching Microsoft storage accounting', () => {
    expect(GB_IN_BYTES).toBe(1_073_741_824)
    expect(BASE_ENTITLEMENT_BYTES).toBe(1024 * GB_IN_BYTES)
  })
})

describe('isSelfServiceUnitCount', () => {
  it('recognises the sentinel seat counts Microsoft reports for free plans', () => {
    expect(isSelfServiceUnitCount(10_000)).toBe(true)
    expect(isSelfServiceUnitCount(1_000_000)).toBe(true)
    expect(isSelfServiceUnitCount(10_000_000)).toBe(true)
  })

  it('leaves a purchased seat count alone', () => {
    expect(isSelfServiceUnitCount(200)).toBe(false)
    expect(isSelfServiceUnitCount(SELF_SERVICE_UNIT_SENTINEL - 1)).toBe(false)
  })
})

describe('estimateEntitlementBytes on a real tenant shape', () => {
  const realTenantSkus: LicenseSku[] = [
    sku('MCOPSTNC', 10_000_000),
    sku('STREAM', 1_000_000),
    sku('FORMS_PRO', 1_000_000),
    sku('POWER_BI_STANDARD', 1_000_000),
    sku('FLOW_FREE', 10_000),
    sku('POWERAPPS_VIRAL', 10_000),
    sku('Microsoft_Teams_Enterprise_New', 225),
    sku('Microsoft_365_E5_(no_Teams)', 200),
    sku('Microsoft_365_Copilot', 80),
    sku('VISIOCLIENT', 15),
  ]

  it('ignores free and viral SKUs reported with a sentinel seat count', () => {
    const purchasedSeats = 225 + 200 + 80 + 15
    expect(estimateEntitlementBytes(realTenantSkus)).toBe(
      BASE_ENTITLEMENT_BYTES + purchasedSeats * 10 * GB_IN_BYTES,
    )
  })

  it('stays inside a plausible range instead of reporting petabytes', () => {
    const tib = estimateEntitlementBytes(realTenantSkus) / (1024 * GB_IN_BYTES)
    expect(tib).toBeLessThan(100)
    expect(tib).toBeGreaterThan(1)
  })
})
