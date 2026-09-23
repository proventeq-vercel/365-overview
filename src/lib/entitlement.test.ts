import { describe, it, expect } from 'vitest'
import type { LicenseSku } from '@/types/reports'
import {
  BASE_ENTITLEMENT_BYTES,
  GB_IN_BYTES,
  ONEDRIVE_STANDALONE_BYTES_PER_LICENCE,
  PER_LICENCE_STORAGE_BYTES,
  STORAGE_ADD_ON_BYTES_PER_UNIT,
  estimateEntitlementBytes,
  skuStorageBytesPerLicence,
} from './entitlement'

const sku = (skuPartNumber: string, enabled: number, servicePlans: string[]): LicenseSku => ({
  skuId: skuPartNumber,
  skuPartNumber,
  consumed: enabled,
  enabled,
  available: 0,
  servicePlans,
})

describe('skuStorageBytesPerLicence', () => {
  it('grants 10 GiB for a SKU carrying a full SharePoint plan', () => {
    expect(skuStorageBytesPerLicence(['SHAREPOINTENTERPRISE', 'SHAREPOINTWAC'])).toBe(
      PER_LICENCE_STORAGE_BYTES,
    )
    expect(skuStorageBytesPerLicence(['SHAREPOINTSTANDARD'])).toBe(PER_LICENCE_STORAGE_BYTES)
  })

  it('grants 10 GiB for Visio and Project companions that carry no SHAREPOINT plan', () => {
    expect(skuStorageBytesPerLicence(['VISIOCLIENT', 'ONEDRIVE_BASIC'])).toBe(
      PER_LICENCE_STORAGE_BYTES,
    )
    expect(skuStorageBytesPerLicence(['PROJECT_PROFESSIONAL'])).toBe(PER_LICENCE_STORAGE_BYTES)
  })

  it('grants 1 GiB per unit for the Extra File Storage add-on, even beside a full plan', () => {
    expect(skuStorageBytesPerLicence(['SHAREPOINTSTORAGE', 'SHAREPOINTENTERPRISE'])).toBe(
      STORAGE_ADD_ON_BYTES_PER_UNIT,
    )
  })

  it('grants 0.5 GiB for OneDrive standalone plans', () => {
    expect(skuStorageBytesPerLicence(['ONEDRIVESTANDARD'])).toBe(
      ONEDRIVE_STANDALONE_BYTES_PER_LICENCE,
    )
    expect(skuStorageBytesPerLicence(['WACONEDRIVEENTERPRISE'])).toBe(
      ONEDRIVE_STANDALONE_BYTES_PER_LICENCE,
    )
  })

  it('grants nothing for Office for the Web, frontline and OneDrive Basic plans', () => {
    expect(skuStorageBytesPerLicence(['SHAREPOINTWAC'])).toBe(0)
    expect(skuStorageBytesPerLicence(['SHAREPOINTDESKLESS'])).toBe(0)
    expect(skuStorageBytesPerLicence(['ONEDRIVE_BASIC_P2', 'SHAREPOINTWAC'])).toBe(0)
    expect(skuStorageBytesPerLicence([])).toBe(0)
  })

  it('is case-insensitive and ignores blank plan names', () => {
    expect(skuStorageBytesPerLicence(['sharepointenterprise', ' '])).toBe(
      PER_LICENCE_STORAGE_BYTES,
    )
  })
})

describe('estimateEntitlement', () => {
  it('is the 1 TiB base when no licences are purchased', () => {
    expect(estimateEntitlementBytes([])).toBe(BASE_ENTITLEMENT_BYTES)
  })

  it('multiplies by purchased units, not consumed units', () => {
    const skus = [{ ...sku('SPE_E5', 100, ['SHAREPOINTENTERPRISE']), consumed: 40 }]
    expect(estimateEntitlementBytes(skus)).toBe(BASE_ENTITLEMENT_BYTES + 100 * 10 * GB_IN_BYTES)
  })

  it('adds nothing for a SKU with no enabled units, whatever plans it carries', () => {
    expect(
      estimateEntitlementBytes([sku('DYN365_SANDBOX', 0, ['SHAREPOINTENTERPRISE'])]),
    ).toBe(BASE_ENTITLEMENT_BYTES)
  })

  it('never subtracts for a SKU reporting a negative unit count, which P365 skips', () => {
    expect(
      estimateEntitlementBytes([sku('ENTERPRISEPACK', -5, ['SHAREPOINTENTERPRISE'])]),
    ).toBe(BASE_ENTITLEMENT_BYTES)
  })

  it('uses binary GB, matching Microsoft storage accounting', () => {
    expect(GB_IN_BYTES).toBe(1_073_741_824)
    expect(BASE_ENTITLEMENT_BYTES).toBe(1024 * GB_IN_BYTES)
  })

})

describe('estimateEntitlement on the real tenant shape', () => {
  const realTenantSkus: LicenseSku[] = [
    sku('MCOPSTNC', 10_000_000, []),
    sku('STREAM', 1_000_000, []),
    sku('FORMS_PRO', 1_000_000, []),
    sku('POWER_BI_STANDARD', 1_000_000, []),
    sku('FLOW_FREE', 10_000, []),
    sku('POWERAPPS_VIRAL', 10_000, []),
    sku('Microsoft_Teams_Enterprise_New', 225, ['ONEDRIVE_BASIC_P2', 'SHAREPOINTWAC']),
    sku('Microsoft_365_E5_(no_Teams)', 200, ['SHAREPOINTENTERPRISE', 'SHAREPOINTWAC']),
    sku('Microsoft_365_Copilot', 80, ['M365_COPILOT_SHAREPOINT']),
    sku('PROJECTPREMIUM', 40, ['PROJECT_PROFESSIONAL', 'SHAREPOINTWAC', 'SHAREPOINT_PROJECT', 'SHAREPOINTENTERPRISE']),
    sku('VISIOCLIENT', 15, ['VISIOCLIENT', 'ONEDRIVE_BASIC']),
    sku('MICROSOFT_AGENT_365_TIER_3', 25, ['ONEDRIVE_BASIC_P2', 'SHAREPOINTENTERPRISE_A365', 'SHAREPOINTWAC']),
  ]

  it('counts only the 255 seats that carry a storage-granting plan', () => {
    expect(estimateEntitlementBytes(realTenantSkus)).toBe(
      BASE_ENTITLEMENT_BYTES + (200 + 40 + 15) * 10 * GB_IN_BYTES,
    )
  })

  it('ignores sentinel-count free SKUs by their plans alone, with no seat-count heuristic', () => {
    const tib = estimateEntitlementBytes(realTenantSkus) / (1024 * GB_IN_BYTES)
    expect(tib).toBeCloseTo(3.49, 2)
  })

})
