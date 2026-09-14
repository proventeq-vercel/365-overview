import type { ComponentType } from 'react'
import { HardDrive, type LucideIcon } from 'lucide-react'
import { StorageOptimization } from './storageOptimization/StorageOptimization'

export interface ReportDefinition {
  id: string
  path: string
  title: string
  icon: LucideIcon
  Component: ComponentType
}

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: 'storage-optimisation',
    path: '/storage-optimisation',
    title: 'Storage Optimisation',
    icon: HardDrive,
    Component: StorageOptimization,
  },
]

export const DEFAULT_REPORT = REPORTS[0]
