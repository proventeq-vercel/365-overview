export interface LicenseSku {
  skuId: string;
  skuPartNumber: string;
  consumed: number;
  enabled: number;
  available: number;
  servicePlans: string[];
}

export interface OrgInfo {
  id: string;
  displayName: string;
  verifiedDomain: string;
  country: string | null;
}

export interface UsagePoint {
  date: string;
  value: number;
}
