import { formatBytes, formatLongMonthYear, formatSignedBytes } from '@/lib/format'
import { FORECAST_CHART_MONTHS } from '@/lib/forecast'
import type { ForecastStatus, StorageOverview } from '@/types/storage'
import type { TranslateFn } from '@/hooks/useTranslation'
import { RISK_LABEL, type LabelTone } from '@/design/theme'

const FORECAST_HORIZON_YEARS = 10

function forecastNeedsAction(status: ForecastStatus): boolean {
  return status === 'Critical' || status === 'Warning'
}

function exhaustionLabel(overview: StorageOverview): string | null {
  const date = overview.growth.forecastExhaustionDate
  return date === null ? null : formatLongMonthYear(date)
}

function rateWindow(overview: StorageOverview, t: TranslateFn): string {
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

function firstDayNote(overview: StorageOverview, t: TranslateFn): string {
  return overview.sharePoint.usedFromSiteReport
    ? t('storageOptimisation.growth.noTrendNote')
    : t('storageOptimisation.growth.firstDayNote')
}

const joined = (...parts: (string | null)[]) => parts.filter((part) => part !== null).join(' ')

export function estimatedQuotaNote(overview: StorageOverview, t: TranslateFn): string | null {
  if (!overview.caveats.entitlementIsEstimated) return null
  return overview.cost.applies || overview.archive.savingApplies
    ? t('storageOptimisation.growth.estimatedQuotaNote')
    : t('storageOptimisation.growth.estimatedQuotaHeadroomNote')
}

export function costHint(overview: StorageOverview, rate: string, t: TranslateFn): string {
  return joined(t('storageOptimisation.kpi.costOfNothingHint', { rate }), dailyRateNote(overview, t))
}

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
      hint: firstDayNote(overview, t),
    }
  }

  if (sharePoint.entitledBytes === null || sharePoint.remainingBytes === null) {
    return {
      label: t('storageOptimisation.kpi.growthPerMonth'),
      value: formatSignedBytes(growth.avgMonthlyGrowthBytes),
      status: null,
      hint: t('storageOptimisation.kpi.growthPerMonthHint', {
        used,
        growth: formatSignedBytes(growth.avgMonthlyGrowthBytes),
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
    hint,
  })

  const date = exhaustionLabel(overview)
  if (date !== null) {
    return card(date, joined(t('storageOptimisation.kpi.forecastHint', figures), dailyRateNote(overview, t)))
  }
  if (growth.forecastMonthsToExhaustion === 0) {
    return card(
      t('storageOptimisation.growth.alreadyExhausted'),
      t('storageOptimisation.growth.alreadyExhaustedNote'),
    )
  }
  if (growth.forecastMonthsToExhaustion === null) {
    return card(
      t('storageOptimisation.kpi.forecastNone'),
      growth.rateSource === 'monthly'
        ? t('storageOptimisation.kpi.forecastNoGrowthHint', { ...figures, months: growth.windowMonths })
        : t('storageOptimisation.kpi.forecastNoGrowthDailyHint', { ...figures, days: growth.windowDays }),
    )
  }
  return card(
    t('storageOptimisation.kpi.forecastBeyondHorizon', { years: FORECAST_HORIZON_YEARS }),
    joined(
      t('storageOptimisation.kpi.forecastBeyondHorizonHint', { ...figures, years: FORECAST_HORIZON_YEARS }),
      dailyRateNote(overview, t),
    ),
  )
}

interface ForecastCallout {
  tone: 'info' | 'warn'
  pill: LabelTone
  pillLabel: string
  headline: string
  note: string
}

function headlineAndNote(overview: StorageOverview, t: TranslateFn): [string, string | null, string | null] {
  const { sharePoint, growth } = overview
  const status = growth.forecastStatus
  const date = exhaustionLabel(overview)

  if (sharePoint.exhausted) {
    return [
      t('storageOptimisation.growth.alreadyExhausted'),
      t('storageOptimisation.growth.alreadyExhaustedNote'),
      sharePoint.usedFromSiteReport ? t('storageOptimisation.growth.siteReportSource') : null,
    ]
  }
  if (growth.rateSource === 'none') {
    return [
      t('storageOptimisation.growth.firstDay', { used: formatBytes(sharePoint.usedBytes) }),
      firstDayNote(overview, t),
      null,
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
      null,
    ]
  }
  const dailyNote = dailyRateNote(overview, t)
  if (date !== null) {
    return [
      t('storageOptimisation.growth.exhaustsOn', { date }),
      forecastNeedsAction(status)
        ? t('storageOptimisation.growth.impactNote')
        : t('storageOptimisation.growth.impactNoteNoActionNeeded'),
      dailyNote,
    ]
  }
  return [
    t('storageOptimisation.growth.noExhaustion', { years: FORECAST_HORIZON_YEARS }),
    t('storageOptimisation.growth.noExhaustionNote', { years: FORECAST_HORIZON_YEARS }),
    dailyNote,
  ]
}

function pillLabel(overview: StorageOverview, t: TranslateFn): string {
  const { forecastStatus, rateSource } = overview.growth
  if (forecastStatus !== 'Unknown') return t(`storageOptimisation.growth.risk.${forecastStatus}`)
  return rateSource === 'none'
    ? t('storageOptimisation.growth.pill.latest')
    : t('storageOptimisation.growth.pill.projection')
}

export function buildCallout(overview: StorageOverview, t: TranslateFn): ForecastCallout {
  const { growth } = overview
  const status = growth.forecastStatus
  const [headline, note, dailyNote] = headlineAndNote(overview, t)

  return {
    tone: forecastNeedsAction(status) ? 'warn' : 'info',
    pill: RISK_LABEL[status],
    pillLabel: pillLabel(overview, t),
    headline,
    note: joined(
      note,
      dailyNote,
      estimatedQuotaNote(overview, t),
      growth.seriesIsVolatile ? t('storageOptimisation.growth.volatileNote') : null,
    ),
  }
}
