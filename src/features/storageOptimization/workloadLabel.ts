import type { TranslateFn } from '@/hooks/useTranslation'
import type { Workload } from '@/types/storage'

export function workloadLabel(workload: Workload, t: TranslateFn): string {
  return t(`storageOptimisation.workload.name.${workload}`)
}
