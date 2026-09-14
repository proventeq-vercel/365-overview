import { StatCard } from '@/design/StatCard'
import { P365 } from '@/design/theme'
import { formatBytes, formatNumber } from '@/lib/format'
import type { StorageOverview } from '@/types/storage'
import { COPY } from './copy'

export function OneDriveKpiCards({ overview }: { overview: StorageOverview }) {
  const { usedBytes, driveCount, drivesNearCap, deletedButBilling } = overview.oneDrive

  return (
    <div className="enter-rise grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: '40ms' }}>
      <StatCard
        label={COPY.kpi.used}
        value={formatBytes(usedBytes)}
        color={P365.navy}
        information={COPY.kpi.usedHint}
      />
      <StatCard
        label={COPY.kpi.drives}
        value={formatNumber(driveCount)}
        color={P365.blue}
        information={COPY.kpi.drivesHint}
      />
      <StatCard
        label={COPY.kpi.nearCap}
        value={formatNumber(drivesNearCap)}
        color={drivesNearCap > 0 ? P365.orange : P365.green}
        information={drivesNearCap > 0 ? COPY.kpi.nearCapHint : COPY.kpi.nearCapNone}
      />
      <StatCard
        label={COPY.kpi.retained}
        value={formatBytes(deletedButBilling.bytes)}
        color={deletedButBilling.count > 0 ? P365.yellow : P365.grey400}
        information={
          deletedButBilling.count > 0
            ? COPY.kpi.retainedHint(formatNumber(deletedButBilling.count))
            : COPY.kpi.retainedNone
        }
      />
    </div>
  )
}
