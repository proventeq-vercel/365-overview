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
  const { sharePoint } = overview
  if (!sharePoint.trendRead) return t('storageOptimisation.growth.trendUnreadNote')
  return sharePoint.usedFromSiteReport
    ? t('storageOptimisation.growth.noTrendNote')
    : t('storageOptimisation.growth.firstDayNote')
}

function siteReportSource(overview: StorageOverview, t: TranslateFn): string | null {
  const { sharePoint } = overview
  if (!sharePoint.usedFromSiteReport) return null
  return sharePoint.trendRead
    ? t('storageOptimisation.growth.siteReportSource')
    : t('storageOptimisation.growth.siteReportSourceTrendUnread')
}

export function storageUsedSource(overview: StorageOverview, t: TranslateFn): string | null {
  const { sharePoint } = overview
  if (!sharePoint.usedFromSiteReport) return null
  return sharePoint.trendRead
    ? t('storageOptimisation.kpi.usedFromSiteReport')
    : t('storageOptimisation.kpi.usedFromSiteReportTrendUnread')
}

const joined = (...parts: (string | null)[]) => parts.filter((part) => part !== null).join(' ')

const shortHint = (hint: string, overview: StorageOverview, t: TranslateFn) =>
  [hint, dailyRateNote(overview, t)].filter((part) => part !== null).join(' · ')

export function estimatedQuotaNote(overview: StorageOverview, t: TranslateFn): string | null {
  if (!overview.caveats.entitlementIsEstimated) return null
  return overview.cost.applies || overview.archive.savingApplies
    ? t('storageOptimisation.growth.estimatedQuotaNote')
    : t('storageOptimisation.growth.estimatedQuotaHeadroomNote')
}

export function costHint(overview: StorageOverview, rate: string, t: TranslateFn): string {
  const hint =
    overview.sharePoint.entitledBytes === null
      ? t('storageOptimisation.kpi.costOfNothingHintNoEntitlement', { rate })
      : t('storageOptimisation.kpi.costOfNothingHint', { rate })
  return joined(hint, dailyRateNote(overview, t))
}

export interface ForecastCard {
  value: string
  status: ForecastStatus
  hint: string
}

export function forecastCard(exhaustionDate: string, overview: StorageOverview, t: TranslateFn): ForecastCard {
  return {
    value: formatLongMonthYear(exhaustionDate),
    status: overview.growth.forecastStatus,
    hint: shortHint(t('storageOptimisation.kpi.forecastHint'), overview, t),
  }
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
      siteReportSource(overview, t),
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
