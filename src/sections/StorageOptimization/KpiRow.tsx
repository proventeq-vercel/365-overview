import { StatCard } from '@/components/StatCard'
import { formatBytes, formatPercent } from '@/lib/format'
import type { StorageOverview } from '@/types/storage'
import { COPY } from './copy'
import { RISK_TONE, forecastHeadline, forecastHint } from './forecastCopy'
import { formatMoney } from './money'

interface Props {
  overview: StorageOverview
}

export function KpiRow({ overview }: Props) {
  const { sharePoint, growth, cost, caveats } = overview
  const quotaKnown = sharePoint.entitledBytes !== null
  const estimated = caveats.entitlementIsEstimated ? COPY.estimatedMarker : null
  const rate = formatMoney(cost.ratePerGb, cost.currency)
  const withEstimate = (text: string) => [text, estimated].filter(Boolean).join(' · ')

  const used = {
    sub:
      sharePoint.entitledBytes === null
        ? COPY.kpi.usedEntitlementUnknown
        : withEstimate(
            COPY.kpi.usedOfEntitled(
              formatBytes(sharePoint.usedBytes),
              formatBytes(sharePoint.entitledBytes),
            ),
          ),
    status: sharePoint.utilization ?? undefined,
  }

  const remaining =
    sharePoint.remainingBytes === null || sharePoint.headroomRatio === null
      ? { value: COPY.kpi.unknown, sub: COPY.kpi.remainingUnknownHint }
      : {
          value: formatBytes(sharePoint.remainingBytes),
          sub: withEstimate(COPY.kpi.remainingHint(formatPercent(sharePoint.headroomRatio, 1))),
        }

  const billable =
    cost.growthBillableAnnual === null
      ? { value: COPY.kpi.unknown, sub: COPY.kpi.costOfNothingHintUnknownQuota(rate) }
      : {
          value:
            cost.growthBillableAnnual > 0
              ? formatMoney(cost.growthBillableAnnual, cost.currency)
              : COPY.kpi.costOfNothingNone,
          sub: withEstimate(COPY.kpi.costOfNothingHint(rate)),
        }

  return (
    <div className="enter-rise grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={COPY.kpi.used}
        value={formatBytes(sharePoint.usedBytes)}
        sub={
          <>
            {used.sub}
            <br />
            {COPY.kpi.usedTenantWide}
          </>
        }
        status={used.status}
      />
      <StatCard label={COPY.kpi.remaining} value={remaining.value} sub={remaining.sub} />
      <StatCard label={COPY.kpi.costOfNothing} value={billable.value} sub={billable.sub} />
      <StatCard
        label={COPY.kpi.forecast}
        value={forecastHeadline(overview)}
        sub={withEstimate(forecastHint(overview))}
        status={quotaKnown ? RISK_TONE[growth.forecastStatus] : undefined}
      />
    </div>
  )
}
