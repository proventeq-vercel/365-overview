import type { ComponentType } from 'react'
import { Cloud, HardDrive, type LucideIcon } from 'lucide-react'
import { FeatureFlags, type FeatureFlag } from '@/config/featureFlags'
import type { TranslateKey } from '@/hooks/useTranslation'
import { OneDriveUsage } from './oneDriveUsage/OneDriveUsage'
import { StorageOptimization } from './storageOptimization/StorageOptimization'

export interface ReportDefinition {
  id: string
  path: string
  titleKey: TranslateKey
  icon: LucideIcon
  requireFeature: FeatureFlag
  Component: ComponentType
}

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: 'storage-optimisation',
    path: '/storage-optimisation',
    titleKey: 'reports.storageOptimisation.title',
    icon: HardDrive,
    requireFeature: FeatureFlags.OptimizationStorageReportOverview,
    Component: StorageOptimization,
  },
  {
    id: 'onedrive-usage',
    path: '/onedrive-usage',
    titleKey: 'reports.oneDriveUsage.title',
    icon: Cloud,
    requireFeature: FeatureFlags.OptimizationStorageReportOneDrive,
    Component: OneDriveUsage,
  },
]

export function enabledReports(features: ReadonlySet<FeatureFlag>): ReportDefinition[] {
  return REPORTS.filter((report) => features.has(report.requireFeature))
}
