import { formatLongMonthYear } from '@/lib/format'
import type { HealthStatus } from '@/lib/thresholds'
import type { ForecastStatus, StorageOverview } from '@/types/storage'
import type { TranslateFn } from '@/hooks/useTranslation'

const FORECAST_HORIZON_YEARS = 10

export const RISK_TONE: Record<ForecastStatus, HealthStatus | undefined> = {
  Healthy: 'healthy',
  Warning: 'watch',
  Critical: 'attention',
  Unknown: undefined,
}

export function forecastNeedsAction(status: ForecastStatus): boolean {
  return status === 'Critical' || status === 'Warning'
}

export function exhaustionLabel(overview: StorageOverview): string | null {
  const date = overview.growth.forecastExhaustionDate
  return date === null ? null : formatLongMonthYear(date)
}

export function forecastHeadline(overview: StorageOverview, t: TranslateFn): string {
  const { sharePoint, growth } = overview
  if (sharePoint.entitledBytes === null) return t('storageOptimisation.kpi.unknown')
  const date = exhaustionLabel(overview)
  if (date !== null) return date
  if (growth.forecastMonthsToExhaustion === 0) return t('storageOptimisation.growth.alreadyExhausted')
  if (growth.forecastStatus === 'Unknown') return t('storageOptimisation.kpi.forecastInsufficient')
  return growth.forecastMonthsToExhaustion !== null &&
    growth.forecastMonthsToExhaustion >= FORECAST_HORIZON_YEARS * 12
    ? t('storageOptimisation.kpi.forecastBeyondHorizon', { years: FORECAST_HORIZON_YEARS })
    : t('storageOptimisation.kpi.forecastNone')
}

export function forecastHint(overview: StorageOverview, t: TranslateFn): string {
  const { sharePoint, growth } = overview
  if (sharePoint.entitledBytes === null) return t('storageOptimisation.kpi.forecastUnknownHint')
  if (exhaustionLabel(overview) !== null) return t('storageOptimisation.kpi.forecastHint')
  if (growth.forecastMonthsToExhaustion === 0) return t('storageOptimisation.growth.alreadyExhaustedNote')
  return growth.forecastStatus === 'Unknown'
    ? t('storageOptimisation.kpi.forecastInsufficientHint')
    : t('storageOptimisation.kpi.forecastHint')
}

export interface ForecastCallout {
  tone: 'info' | 'warn'
  pillLabel: string
  pillStatus: HealthStatus | null
  headline: string
  note: string
}

export function buildCallout(overview: StorageOverview, t: TranslateFn): ForecastCallout {
  const { sharePoint, growth, caveats } = overview
  const quotaKnown = sharePoint.entitledBytes !== null
  const status = growth.forecastStatus
  const date = exhaustionLabel(overview)

  const [headline, note] = !quotaKnown
    ? [t('storageOptimisation.growth.forecastUnavailable'), t('storageOptimisation.growth.forecastUnavailableNote')]
    : date !== null
      ? [
          t('storageOptimisation.growth.exhaustsOn', { date }),
          forecastNeedsAction(status)
            ? t('storageOptimisation.growth.impactNote')
            : t('storageOptimisation.growth.impactNoteNoActionNeeded'),
        ]
      : status === 'Critical'
        ? [t('storageOptimisation.growth.alreadyExhausted'), t('storageOptimisation.growth.alreadyExhaustedNote')]
        : status === 'Unknown'
          ? [t('storageOptimisation.growth.forecastIndeterminate'), t('storageOptimisation.growth.forecastIndeterminateNote')]
          : [
              t('storageOptimisation.growth.noExhaustion', { years: FORECAST_HORIZON_YEARS }),
              t('storageOptimisation.growth.noExhaustionNote', { years: FORECAST_HORIZON_YEARS }),
            ]

  return {
    tone: forecastNeedsAction(status) ? 'warn' : 'info',
    pillLabel: quotaKnown ? t(`storageOptimisation.growth.risk.${status}`) : t('storageOptimisation.kpi.unknown'),
    pillStatus: quotaKnown ? (RISK_TONE[status] ?? null) : null,
    headline,
    note: [
      note,
      caveats.entitlementIsEstimated ? t('storageOptimisation.growth.estimatedQuotaNote') : null,
      growth.seriesIsVolatile ? t('storageOptimisation.growth.volatileNote') : null,
    ]
      .filter((part) => part !== null)
      .join(' '),
  }
}
