export const FORECAST_HORIZON_YEARS = 10

export const COPY = {
  kpi: {
    used: 'Storage used',
    usedOfEntitled: (used: string, entitled: string) => `${used} of ${entitled} entitlement`,
    usedEntitlementUnknown: 'Tenant entitlement unavailable',
    usedTenantWide: 'Tenant-wide, as reported by Microsoft 365',
    remaining: 'Remaining',
    remainingHint: (percent: string) => `${percent} headroom`,
    remainingUnknownHint: 'Tenant entitlement unavailable',
    unknown: 'Unknown',
    costOfNothing: 'Cost of doing nothing',
    costOfNothingNone: 'No change today',
    costOfNothingHint: (rate: string) =>
      `What a year of growth would add to your bill, at ${rate}/GB per month. Growth that still fits inside your entitlement adds nothing.`,
    costOfNothingHintUnknownQuota: (rate: string) =>
      `The tenant entitlement could not be read, so the effect on your bill cannot be calculated. Storage is valued at ${rate}/GB per month.`,
    forecast: 'Forecast exhaustion',
    forecastNone: 'No growth detected',
    forecastInsufficient: 'Not enough history',
    forecastInsufficientHint: 'Too few months of measured growth',
    forecastBeyondHorizon: (years: number) => `Beyond ${years} years`,
    forecastHint: 'At current growth',
    forecastUnknownHint: 'Needs tenant entitlement',
  },
  quota: {
    title: 'Quota usage',
    scopeNote: 'Tenant-wide usage against the Microsoft 365 entitlement',
    entitlementUnknown: 'Tenant entitlement unavailable, so quota usage cannot be shown',
    used: 'Used',
    remaining: 'Available',
  },
  growth: {
    trendTitle: 'Storage trend & forecast',
    actual: 'Actual used',
    forecast: 'Linear forecast',
    entitlement: 'Entitlement',
    impactTitle: 'Growth impact',
    risk: { Critical: 'Critical', Warning: 'At risk', Healthy: 'Healthy', Unknown: 'Unknown' },
    exhaustsOn: (date: string) => `Capacity exhausts around ${date}`,
    noExhaustion: (years: number) => `No exhaustion forecast within ${years} years`,
    forecastIndeterminate: 'Not enough history to forecast capacity',
    forecastIndeterminateNote:
      'There are too few months of measured growth to project a trajectory. This is not an all-clear — the forecast will appear once more history has accumulated.',
    alreadyExhausted: 'Entitlement already exceeded',
    alreadyExhaustedNote:
      'The tenant is already using more than its pooled entitlement, so there is no future exhaustion date to project. Procurement or cleanup is needed now.',
    forecastUnavailable: 'Capacity forecast unavailable without tenant entitlement',
    forecastUnavailableNote:
      'The tenant storage quota could not be read, so headroom and exhaustion cannot be projected. Enter your real entitlement in settings to see them.',
    estimatedQuotaNote:
      'Your storage quota was estimated from licence counts rather than read from Microsoft, so the headroom and cost figures are approximate.',
    volatileNote:
      'The monthly figures the rate is derived from are uneven — one month dominates rather than a steady trend — so a single average is a weak guide here. Treat the projection as indicative.',
    impactNote:
      'At the current growth rate the tenant is projected to pass its pooled entitlement on this trajectory. Procurement or cleanup is needed before then.',
    impactNoteNoActionNeeded:
      'At the current growth rate the tenant is projected to pass its pooled entitlement on this trajectory, but not for years — capacity needs no action today.',
    noExhaustionNote: (years: number) =>
      `At the current growth rate the tenant stays within its pooled entitlement for at least the next ${years} years.`,
    usedToday: 'Used today',
    forecastEnd: (months: number) => `Forecast (${months} mo)`,
    overEntitlement: 'Over entitlement today',
    costTitle: 'Projected cost if nothing changes',
    costSubtitle: 'Extra spend as storage grows, at the configured rate.',
    costTitleNotional: 'Projected value of growth',
    costSubtitleNotional:
      'Notional cost of the storage added, at the configured rate. Your entitlement is unknown, so this is not billable spend.',
    nextTwelveMonths: 'Next 12 months',
    cumulativeThreeYears: 'Cumulative, 3 years',
    avgMonthlyGrowth: 'Avg growth / mo',
    addedInWindow: (months: number) => `Added last ${months} mo`,
    sites: 'Sites',
    drivesNearCap: 'Drives near cap',
  },
  concealedNamesNote:
    'Your tenant conceals user and site names in usage reports, so identities below appear as hashes. The storage figures are unaffected. To show real names: Microsoft 365 admin centre → Settings → Org settings → Reports → uncheck "Display concealed user, group, and site names".',
  reportLagNote: 'Microsoft usage reports lag by two to three days.',
  workloadGroupingNote:
    'Grouped by site template, which is what Microsoft Graph reports. These counts will not match the SharePoint admin centre, which groups differently.',
  offendersFooter:
    'Full discovery finds the duplicates, version overhead and trivial content underneath these numbers.',
  estimatedMarker: 'Estimated entitlement',
} as const
