export const HELP_TOPICS = {
  overview: '',
  enableAccess: 'getting-started/enable-access',
  troubleshooting: 'getting-started/troubleshooting',
  storageOptimisation: 'reports/storage-optimisation',
  storageDistribution: 'reports/storage-optimisation/storage-distribution',
  tenantCapacity: 'reports/storage-optimisation/tenant-capacity',
  growthForecast: 'reports/storage-optimisation/growth-forecast',
  mainOffenders: 'reports/storage-optimisation/main-offenders',
  oneDriveUsage: 'reports/onedrive-usage',
  oneDriveOverLicence: 'reports/onedrive-usage/over-licence',
  oneDriveDrives: 'reports/onedrive-usage/drives',
} as const

export type HelpTopic = keyof typeof HELP_TOPICS
