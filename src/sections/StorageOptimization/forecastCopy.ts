import { formatLongMonthYear } from '@/lib/format'
import type { HealthStatus } from '@/lib/thresholds'
import type { ForecastStatus, StorageOverview } from '@/types/storage'
import { COPY, FORECAST_HORIZON_YEARS } from './copy'

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

export function forecastHeadline(overview: StorageOverview): string {
  const { sharePoint, growth } = overview
  if (sharePoint.entitledBytes === null) return COPY.kpi.unknown
  const date = exhaustionLabel(overview)
  if (date !== null) return date
  if (growth.forecastMonthsToExhaustion === 0) return COPY.growth.alreadyExhausted
  if (growth.forecastStatus === 'Unknown') return COPY.kpi.forecastInsufficient
  return growth.forecastMonthsToExhaustion !== null &&
    growth.forecastMonthsToExhaustion >= FORECAST_HORIZON_YEARS * 12
    ? COPY.kpi.forecastBeyondHorizon(FORECAST_HORIZON_YEARS)
    : COPY.kpi.forecastNone
}

export function forecastHint(overview: StorageOverview): string {
  const { sharePoint, growth } = overview
  if (sharePoint.entitledBytes === null) return COPY.kpi.forecastUnknownHint
  if (exhaustionLabel(overview) !== null) return COPY.kpi.forecastHint
  if (growth.forecastMonthsToExhaustion === 0) return COPY.growth.alreadyExhaustedNote
  return growth.forecastStatus === 'Unknown'
    ? COPY.kpi.forecastInsufficientHint
    : COPY.kpi.forecastHint
}

export interface ForecastCallout {
  tone: 'info' | 'warn'
  pillLabel: string
  pillStatus: HealthStatus | null
  headline: string
  note: string
}

export function buildCallout(overview: StorageOverview): ForecastCallout {
  const { sharePoint, growth, caveats } = overview
  const quotaKnown = sharePoint.entitledBytes !== null
  const status = growth.forecastStatus
  const date = exhaustionLabel(overview)

  const [headline, note] = !quotaKnown
    ? [COPY.growth.forecastUnavailable, COPY.growth.forecastUnavailableNote]
    : date !== null
      ? [
          COPY.growth.exhaustsOn(date),
          forecastNeedsAction(status)
            ? COPY.growth.impactNote
            : COPY.growth.impactNoteNoActionNeeded,
        ]
      : status === 'Critical'
        ? [COPY.growth.alreadyExhausted, COPY.growth.alreadyExhaustedNote]
        : status === 'Unknown'
          ? [COPY.growth.forecastIndeterminate, COPY.growth.forecastIndeterminateNote]
          : [
              COPY.growth.noExhaustion(FORECAST_HORIZON_YEARS),
              COPY.growth.noExhaustionNote(FORECAST_HORIZON_YEARS),
            ]

  return {
    tone: forecastNeedsAction(status) ? 'warn' : 'info',
    pillLabel: quotaKnown ? COPY.growth.risk[status] : COPY.kpi.unknown,
    pillStatus: quotaKnown ? (RISK_TONE[status] ?? null) : null,
    headline,
    note: [
      note,
      caveats.entitlementIsEstimated ? COPY.growth.estimatedQuotaNote : null,
      growth.seriesIsVolatile ? COPY.growth.volatileNote : null,
    ]
      .filter((part) => part !== null)
      .join(' '),
  }
}
