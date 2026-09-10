import { StatCard } from '@/components/StatCard'
import { formatBytes, formatPercent } from '@/lib/format'
import { STORAGE_THRESHOLDS, utilizationStatus } from '@/lib/thresholds'
import type { StorageOverview } from '@/types/storage'
import { COPY } from './copy'
import { formatMoney } from './money'

interface Props {
  overview: StorageOverview
}

export function KpiRow({ overview }: Props) {
  const { sharePoint, growth, cost, caveats } = overview
  const estimated = caveats.entitlementIsEstimated ? COPY.estimatedMarker : undefined

  const remaining =
    sharePoint.remainingBytes === null || sharePoint.usedPercentage === null
      ? { value: COPY.unknownValue, sub: COPY.forecastUnavailableNote }
      : {
          value: formatBytes(Math.max(0, sharePoint.remainingBytes)),
          sub: [formatPercent(sharePoint.usedPercentage) + ' used', estimated]
            .filter(Boolean)
            .join(' · '),
        }

  const billable =
    cost.growthBillableAnnual === null
      ? { value: COPY.unknownValue, sub: COPY.forecastUnavailableNote }
      : {
          value: formatMoney(cost.growthBillableAnnual, cost.currency),
          sub: [
            COPY.costOfNothingHint(formatMoney(cost.ratePerGb, cost.currency)),
            estimated,
          ]
            .filter(Boolean)
            .join(' · '),
        }

  const forecast = caveats.historyTooShort
    ? { value: COPY.notEnoughHistory, sub: COPY.forecastIndeterminateNote }
    : growth.forecastExhaustionDate === null
      ? {
          value: COPY.unknownValue,
          sub:
            sharePoint.entitledBytes === null
              ? COPY.forecastUnavailableNote
              : COPY.noExhaustionNote(10),
        }
      : {
          value: growth.forecastExhaustionDate,
          sub: [`${growth.forecastMonthsToExhaustion} months of runway`, estimated]
            .filter(Boolean)
            .join(' · '),
        }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Storage used"
        value={formatBytes(sharePoint.usedBytes)}
        sub="SharePoint pool"
        status={
          sharePoint.entitledBytes === null
            ? undefined
            : utilizationStatus(
                sharePoint.usedBytes,
                sharePoint.entitledBytes,
                STORAGE_THRESHOLDS,
              )
        }
      />
      <StatCard label="Remaining" value={remaining.value} sub={remaining.sub} />
      <StatCard label="Cost of doing nothing" value={billable.value} sub={billable.sub} />
      <StatCard label="Forecast exhaustion" value={forecast.value} sub={forecast.sub} />
    </div>
  )
}
