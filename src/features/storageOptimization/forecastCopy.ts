import { formatBytes, formatLongMonthYear, formatSignedBytes } from '@/lib/format'
import { FORECAST_CHART_MONTHS } from '@/lib/forecast'
import type { HealthStatus } from '@/lib/thresholds'
import type { ForecastStatus, StorageOverview } from '@/types/storage'
import type { TranslateFn } from '@/hooks/useTranslation'

const FORECAST_HORIZON_YEARS = 10

const RISK_TONE: Record<ForecastStatus, HealthStatus | undefined> = {
  Healthy: 'healthy',
  Warning: 'watch',
  Critical: 'attention',
  Unknown: undefined,
}

function forecastNeedsAction(status: ForecastStatus): boolean {
  return status === 'Critical' || status === 'Warning'
}

function exhaustionLabel(overview: StorageOverview): string | null {
  const date = overview.growth.forecastExhaustionDate
  return date === null ? null : formatLongMonthYear(date)
}

export function rateWindow(overview: StorageOverview, t: TranslateFn): string {
  const { growth } = overview
  return growth.rateSource === 'monthly'
    ? t('storageOptimisation.growth.window.months', { months: growth.windowMonths })
    : t('storageOptimisation.growth.window.days', { days: growth.windowDays })
}

function dailyRateNote(overview: StorageOverview, t: TranslateFn): string | null {
  return overview.growth.rateSource === 'daily'
    ? t('storageOptimisation.growth.dailyRateNote', { window: rateWindow(overview, t) })
    : null
}

const joined = (...parts: (string | null)[]) => parts.filter((part) => part !== null).join(' ')

export interface ForecastCard {
  label: string
  value: string
  status: ForecastStatus | null
  hint: string
}

export function forecastCard(overview: StorageOverview, t: TranslateFn): ForecastCard {
  const { sharePoint, growth } = overview
  const used = formatBytes(sharePoint.usedBytes)

  if (growth.rateSource === 'none') {
    return {
      label: t('storageOptimisation.kpi.usedToday'),
      value: used,
      status: null,
      hint: t('storageOptimisation.growth.firstDayNote'),
    }
  }

  if (sharePoint.entitledBytes === null || sharePoint.remainingBytes === null) {
    return {
      label: t('storageOptimisation.kpi.growthPerMonth'),
      value: formatSignedBytes(growth.avgMonthlyGrowthBytes),
      status: null,
      hint: t('storageOptimisation.kpi.growthPerMonthHint', {
        used,
        growth: formatBytes(growth.avgMonthlyGrowthBytes),
        window: rateWindow(overview, t),
      }),
    }
  }

  const figures = {
    entitled: formatBytes(sharePoint.entitledBytes),
    remaining: formatBytes(sharePoint.remainingBytes),
    growth: formatBytes(growth.avgMonthlyGrowthBytes),
  }
  const card = (value: string, hint: string): ForecastCard => ({
    label: t('storageOptimisation.kpi.forecast'),
    value,
    status: growth.forecastStatus,
    hint: joined(hint, dailyRateNote(overview, t)),
  })

  const date = exhaustionLabel(overview)
  if (date !== null) return card(date, t('storageOptimisation.kpi.forecastHint', figures))
  if (growth.forecastMonthsToExhaustion === 0) {
    return card(
      t('storageOptimisation.growth.alreadyExhausted'),
      t('storageOptimisation.growth.alreadyExhaustedNote'),
    )
  }
  if (growth.forecastMonthsToExhaustion === null) {
    return {
      label: t('storageOptimisation.kpi.forecast'),
      value: t('storageOptimisation.kpi.forecastNone'),
      status: growth.forecastStatus,
      hint:
        growth.rateSource === 'monthly'
          ? t('storageOptimisation.kpi.forecastNoGrowthHint', { ...figures, months: growth.windowMonths })
          : t('storageOptimisation.kpi.forecastNoGrowthDailyHint', { ...figures, days: growth.windowDays }),
    }
  }
  return card(
    t('storageOptimisation.kpi.forecastBeyondHorizon', { years: FORECAST_HORIZON_YEARS }),
    t('storageOptimisation.kpi.forecastBeyondHorizonHint', { ...figures, years: FORECAST_HORIZON_YEARS }),
  )
}

interface ForecastCallout {
  tone: 'info' | 'warn'
  pillLabel: string
  pillStatus: HealthStatus | null
  headline: string
  note: string
}

function headlineAndNote(overview: StorageOverview, t: TranslateFn): [string, string] {
  const { sharePoint, growth } = overview
  const status = growth.forecastStatus
  const date = exhaustionLabel(overview)

  if (growth.rateSource === 'none') {
    return [
      t('storageOptimisation.growth.firstDay', { used: formatBytes(sharePoint.usedBytes) }),
      t('storageOptimisation.growth.firstDayNote'),
    ]
  }
  if (sharePoint.entitledBytes === null) {
    return [
      t('storageOptimisation.growth.projection', {
        end: formatBytes(growth.forecastEndBytes),
        months: FORECAST_CHART_MONTHS,
      }),
      t('storageOptimisation.growth.projectionNote', {
        growth: formatSignedBytes(growth.avgMonthlyGrowthBytes),
        window: rateWindow(overview, t),
      }),
    ]
  }
  if (date !== null) {
    return [
      t('storageOptimisation.growth.exhaustsOn', { date }),
      forecastNeedsAction(status)
        ? t('storageOptimisation.growth.impactNote')
        : t('storageOptimisation.growth.impactNoteNoActionNeeded'),
    ]
  }
  if (status === 'Critical') {
    return [t('storageOptimisation.growth.alreadyExhausted'), t('storageOptimisation.growth.alreadyExhaustedNote')]
  }
  return [
    t('storageOptimisation.growth.noExhaustion', { years: FORECAST_HORIZON_YEARS }),
    t('storageOptimisation.growth.noExhaustionNote', { years: FORECAST_HORIZON_YEARS }),
  ]
}

function pillLabel(overview: StorageOverview, t: TranslateFn): string {
  const { growth, sharePoint } = overview
  if (growth.rateSource === 'none') return t('storageOptimisation.growth.pill.today')
  if (sharePoint.entitledBytes === null || growth.forecastStatus === 'Unknown') {
    return t('storageOptimisation.growth.pill.projection')
  }
  return t(`storageOptimisation.growth.risk.${growth.forecastStatus}`)
}

export function buildCallout(overview: StorageOverview, t: TranslateFn): ForecastCallout {
  const { growth, caveats } = overview
  const status = growth.forecastStatus
  const [headline, note] = headlineAndNote(overview, t)

  return {
    tone: forecastNeedsAction(status) ? 'warn' : 'info',
    pillLabel: pillLabel(overview, t),
    pillStatus: RISK_TONE[status] ?? null,
    headline,
    note: joined(
      note,
      dailyRateNote(overview, t),
      caveats.entitlementIsEstimated ? t('storageOptimisation.growth.estimatedQuotaNote') : null,
      growth.seriesIsVolatile ? t('storageOptimisation.growth.volatileNote') : null,
    ),
  }
}
