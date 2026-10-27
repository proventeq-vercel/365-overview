import { StatCard } from '@/design/StatCard'
import { KPI_GRID_COLUMNS } from '@/design/kpiGrid'
import { P365 } from '@/design/theme'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes, formatNumber } from '@/lib/format'
import type { OverEntitlement, StorageOverview } from '@/types/storage'

export function OneDriveKpiCards({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { usedBytes, usedFromAccountReport, driveCount, drivesNearCap, deletedButBilling, overEntitlement } =
    overview.oneDrive

  return (
    <div
      className={`enter-rise grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${KPI_GRID_COLUMNS[overEntitlement === null ? 4 : 5]}`}
      style={{ animationDelay: '40ms' }}
    >
      <StatCard
        label={t('oneDrive.kpi.used')}
        value={formatBytes(usedBytes)}
        color={P365.navy}
        information={usedFromAccountReport ? t('oneDrive.kpi.usedFromAccountsHint') : t('oneDrive.kpi.usedHint')}
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
      {overEntitlement !== null && <OverLicenceCard overEntitlement={overEntitlement} />}
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

function OverLicenceCard({ overEntitlement }: { overEntitlement: OverEntitlement }) {
  const t = useTranslation()
  const { limit, count, excessBytes } = overEntitlement
  const excess = formatBytes(excessBytes)
  const perUser = formatBytes(limit.perUserBytes)
  const byDriveLimit = limit.basis === 'driveLimit'
  return (
    <StatCard
      label={byDriveLimit ? t('oneDrive.kpi.overDriveLimit') : t('oneDrive.kpi.overLicence')}
      value={formatNumber(count)}
      color={count > 0 ? P365.orange : P365.green}
      information={
        byDriveLimit
          ? count > 0
            ? t('oneDrive.kpi.overDriveLimitHint', { excess, limit: perUser })
            : t('oneDrive.kpi.overDriveLimitNone', { limit: perUser })
          : count > 0
            ? t('oneDrive.kpi.overLicenceHint', { excess, entitlement: perUser })
            : t('oneDrive.kpi.overLicenceNone', { entitlement: perUser })
      }
    />
  )
}
