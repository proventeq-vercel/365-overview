import { formatBytes, formatPercent } from '@/lib/format'
import { COPY } from './copy'
import { forecastHeadline, forecastHint } from './forecastCopy'
import { formatMoney } from './money'
import type { StorageOverview } from '@/types/storage'
import { StatCard } from '@/design/StatCard'
import { P365, RISK_COLOR } from '@/design/theme'

interface Props {
  overview: StorageOverview
}

export function KpiCards({ overview }: Props) {
  const { sharePoint, growth, cost } = overview
  const quotaKnown = sharePoint.entitledBytes !== null
  const rate = formatMoney(cost.ratePerGb, cost.currency)

  return (
    <div className="enter-rise flex flex-col gap-2" style={{ animationDelay: '40ms' }}>
      <div>
        <p className="text-sm font-semibold text-p365-navy">Tenant capacity</p>
        <p className="text-sm text-p365-grey-500">
          Tenant-wide Microsoft 365 storage measured against your licensed entitlement
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={COPY.kpi.used}
          value={formatBytes(sharePoint.usedBytes)}
          color={P365.navy}
          information={
            <>
              {sharePoint.entitledBytes === null
                ? COPY.kpi.usedEntitlementUnknown
                : COPY.kpi.usedOfEntitled(
                    formatBytes(sharePoint.usedBytes),
                    formatBytes(sharePoint.entitledBytes),
                  )}
              <br />
              {COPY.kpi.usedTenantWide}
            </>
          }
        />
        <StatCard
          label={COPY.kpi.remaining}
          value={
            sharePoint.remainingBytes === null
              ? COPY.kpi.unknown
              : formatBytes(sharePoint.remainingBytes)
          }
          color={quotaKnown ? P365.green : P365.grey400}
          information={
            sharePoint.headroomRatio === null
              ? COPY.kpi.remainingUnknownHint
              : COPY.kpi.remainingHint(formatPercent(sharePoint.headroomRatio, 1))
          }
        />
        <StatCard
          label={COPY.kpi.costOfNothing}
          value={
            cost.growthBillableAnnual === null
              ? COPY.kpi.unknown
              : cost.growthBillableAnnual > 0
                ? formatMoney(cost.growthBillableAnnual, cost.currency)
                : COPY.kpi.costOfNothingNone
          }
          color={cost.growthBillableAnnual === null ? P365.grey400 : P365.yellow}
          information={
            cost.growthBillableAnnual === null
              ? COPY.kpi.costOfNothingHintUnknownQuota(rate)
              : COPY.kpi.costOfNothingHint(rate)
          }
        />
        <StatCard
          label={COPY.kpi.forecast}
          value={forecastHeadline(overview)}
          color={quotaKnown ? RISK_COLOR[growth.forecastStatus] : P365.grey400}
          information={forecastHint(overview)}
        />
      </div>
    </div>
  )
}
