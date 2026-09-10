export const COPY = {
  forecastIndeterminateNote:
    'There are too few months of measured growth to project a trajectory. This is not an all-clear — the forecast will appear once more history has accumulated.',
  alreadyExhaustedNote:
    'The tenant is already using more than its pooled entitlement, so there is no future exhaustion date to project. Procurement or cleanup is needed now.',
  estimatedQuotaNote:
    'Your storage quota was estimated from licence counts rather than read from Microsoft, so the headroom and cost figures are approximate.',
  noExhaustionNote: (years: number) =>
    `At the current growth rate the tenant stays within its pooled entitlement for at least the next ${years} years.`,
  forecastUnavailableNote:
    'Your pooled entitlement could not be determined, so headroom, exhaustion and the billable cost of growth are unavailable. Enter your real entitlement in settings to see them.',
  volatileNote:
    'One month dominates the measured growth, so treat the projection as indicative rather than a trend.',
  costOfNothingHint: (rate: string) =>
    `What a year of growth would add to your bill, at ${rate}/GB per month. Growth that still fits inside your entitlement adds nothing.`,
  impactNote: (date: string) =>
    `At the current growth rate the pooled entitlement is exhausted around ${date}.`,
  concealedNamesNote:
    'Your tenant conceals user and site names in usage reports, so identities below appear as hashes. The storage figures are unaffected. To show real names: Microsoft 365 admin centre → Settings → Org settings → Reports → uncheck "Display concealed user, group, and site names".',
  reportLagNote: 'Microsoft usage reports lag by two to three days.',
  workloadGroupingNote:
    'Grouped by site template, which is what Microsoft Graph reports. These counts will not match the SharePoint admin centre, which groups differently.',
  entitlementUnknownNote:
    'Entitlement unavailable — Microsoft does not publish a tenant storage entitlement, and none could be estimated from the licences on this tenant.',
  offendersFooter:
    'Full discovery finds the duplicates, version overhead and trivial content underneath these numbers.',
  reportFooter:
    'This report is five calls to Microsoft Graph, read in your browser. A full P365 discovery reveals what sits underneath these numbers — duplicate files, version-history overhead, trivial content and per-person attribution.',
  estimatedMarker: 'Estimated entitlement',
  unknownValue: 'Unknown',
  notEnoughHistory: 'Not enough history',
} as const
