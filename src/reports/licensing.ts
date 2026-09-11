import type { LicenseSku } from '../types/reports'

export interface RawSku {
  skuId: string
  skuPartNumber: string
  consumedUnits: number
  prepaidUnits: { enabled: number }
  servicePlans?: { servicePlanName: string }[]
}

export function parseSubscribedSkus(raw: RawSku[]): LicenseSku[] {
  return raw.map((s) => ({
    skuId: s.skuId,
    skuPartNumber: s.skuPartNumber,
    consumed: s.consumedUnits,
    enabled: s.prepaidUnits.enabled,
    available: s.prepaidUnits.enabled - s.consumedUnits,
    servicePlans: (s.servicePlans ?? []).map((plan) => plan.servicePlanName),
  }))
}
