import { describe, it, expect } from 'vitest'
import type { LicenseSku } from '@/types/reports'
import {
  BASE_ENTITLEMENT_BYTES,
  GB_IN_BYTES,
  contributionGbFor,
  estimateEntitlementBytes,
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
