import type { ComponentType } from 'react'
import { Cloud, HardDrive, type LucideIcon } from 'lucide-react'
import { FeatureFlags, type FeatureFlag } from '@/config/featureFlags'
import type { TranslateKey } from '@/hooks/useTranslation'
import { OneDriveUsage } from './oneDriveUsage/OneDriveUsage'
import { REPORT_PATHS } from './reportPaths'
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
    path: REPORT_PATHS.storageOptimisation,
    titleKey: 'reports.storageOptimisation.title',
    icon: HardDrive,
    requireFeature: FeatureFlags.OptimizationStorageReportOverview,
    Component: StorageOptimization,
  },
  {
    id: 'onedrive-usage',
    path: REPORT_PATHS.oneDriveUsage,
    titleKey: 'reports.oneDriveUsage.title',
    icon: Cloud,
    requireFeature: FeatureFlags.OptimizationStorageReportOneDrive,
    Component: OneDriveUsage,
  },
]

export function enabledReports(features: ReadonlySet<FeatureFlag>): ReportDefinition[] {
  return REPORTS.filter((report) => features.has(report.requireFeature))
}
