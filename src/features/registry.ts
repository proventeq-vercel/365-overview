import type { ComponentType } from 'react'
import { Cloud, HardDrive, type LucideIcon } from 'lucide-react'
import { FeatureFlags, type FeatureFlag } from '@/config/featureFlags'
import { OneDriveUsage } from './oneDriveUsage/OneDriveUsage'
import { StorageOptimization } from './storageOptimization/StorageOptimization'

export interface ReportDefinition {
  id: string
  path: string
  title: string
  icon: LucideIcon
  requireFeature: FeatureFlag
  Component: ComponentType
}

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: 'storage-optimisation',
    path: '/storage-optimisation',
    title: 'Storage Optimisation',
    icon: HardDrive,
    requireFeature: FeatureFlags.OptimizationStorageReportOverview,
    Component: StorageOptimization,
  },
  {
    id: 'onedrive-usage',
    path: '/onedrive-usage',
    title: 'OneDrive Usage',
    icon: Cloud,
    requireFeature: FeatureFlags.OptimizationStorageReportOneDrive,
    Component: OneDriveUsage,
  },
]

export function enabledReports(features: ReadonlySet<FeatureFlag>): ReportDefinition[] {
  return REPORTS.filter((report) => features.has(report.requireFeature))
}
