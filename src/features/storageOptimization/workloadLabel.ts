import type { TranslateKey } from '@/hooks/useTranslation'
import type { Workload } from '@/types/storage'

export const WORKLOAD_LABEL = {
  sharePoint: 'storageOptimisation.usage.segment.sharePoint',
  teams: 'storageOptimisation.usage.segment.teams',
  oneDrive: 'table.pool.OneDrive',
} as const satisfies Record<Workload, TranslateKey>
