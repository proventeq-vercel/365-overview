export type ReportPeriod = 'D7' | 'D30' | 'D90' | 'D180'

export interface SharePointSite {
  siteId: string;
  siteUrl: string;
  ownerDisplayName: string;
  fileCount: number;
  activeFileCount: number;
  storageUsedBytes: number;
  storageAllocatedBytes: number;
}

export interface SharePointSummary {
  totalSites: number;
  totalFiles: number;
  activeFiles: number;
  storageUsedBytes: number;
  storageAllocatedBytes: number;
  sites: SharePointSite[];
}

export interface LicenseSku {
  skuId: string;
  skuPartNumber: string;
  consumed: number;
  enabled: number;
  available: number;
  servicePlans: string[];
}

export interface OrgInfo {
  displayName: string;
  verifiedDomain: string;
  country: string | null;
}

export interface UsagePoint {
  date: string;
  value: number;
}

export interface MailboxSummary {
  totalMailboxes: number;
  activeMailboxes: number;
  storageUsedBytes: number;
}

export interface EmailActivityPoint {
  date: string;
  send: number;
  receive: number;
  read: number;
}

export interface AzureSubscription {
  subscriptionId: string;
  displayName: string;
  state: string;
}

export interface AzureResourceCount {
  type: string;
  count: number;
}

export interface AzureCost {
  subscriptionId: string;
  currency: string;
  amount: number;
}
