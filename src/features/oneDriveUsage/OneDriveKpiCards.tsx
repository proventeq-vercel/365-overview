import { StatCard } from '@/design/StatCard'
import { P365 } from '@/design/theme'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes, formatNumber } from '@/lib/format'
import type { StorageOverview } from '@/types/storage'

export function OneDriveKpiCards({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { usedBytes, driveCount, drivesNearCap, deletedButBilling } = overview.oneDrive

  return (
    <div className="enter-rise grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: '40ms' }}>
      <StatCard
        label={t('oneDrive.kpi.used')}
        value={formatBytes(usedBytes)}
        color={P365.navy}
        information={t('oneDrive.kpi.usedHint')}
      />
      <StatCard
        label={t('oneDrive.kpi.drives')}
        value={formatNumber(driveCount)}
        color={P365.blue}
        information={t('oneDrive.kpi.drivesHint')}
      />
      <StatCard
        label={t('oneDrive.kpi.nearCap')}
        value={formatNumber(drivesNearCap)}
        color={drivesNearCap > 0 ? P365.orange : P365.green}
        information={drivesNearCap > 0 ? t('oneDrive.kpi.nearCapHint') : t('oneDrive.kpi.nearCapNone')}
      />
      <StatCard
        label={t('oneDrive.kpi.retained')}
        value={formatBytes(deletedButBilling.bytes)}
        color={deletedButBilling.count > 0 ? P365.yellow : P365.grey400}
        information={
          deletedButBilling.count > 0
            ? t('oneDrive.kpi.retainedHint', { count: formatNumber(deletedButBilling.count) })
            : t('oneDrive.kpi.retainedNone')
        }
      />
    </div>
  )
}
