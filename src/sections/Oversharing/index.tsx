import { ReportShell } from '@/app/ReportShell'
import { ClosingBand } from '@/components/ClosingBand'
import { ConcealedNamesBanner } from '@/components/ConcealedNamesBanner'
import { InsightCallout } from '@/components/InsightCallout'
import { SkeletonReport } from '@/components/SkeletonReport'
import { UnavailablePanel } from '@/components/UnavailablePanel'
import { adminConsentUrl } from '@/config/adminConsent'
import { formatNumber } from '@/lib/format'
import { GRAPH_CALL_COUNT, useOversharingOverview } from '@/hooks/useOversharingOverview'
import { BroadSharing } from './BroadSharing'
import { ExternalAccess } from './ExternalAccess'
import { RiskSummary } from './RiskSummary'
import { SharingPosture } from './SharingPosture'
import { Sites } from './Sites'
import {
  BROAD_SHARING_DESCRIPTION,
  BROAD_SHARING_TITLE,
  EXTERNAL_ACCESS_DESCRIPTION,
  EXTERNAL_ACCESS_TITLE,
  OVERSHARING_BANNER,
  REPORT_DESCRIPTION,
  REPORT_TITLE,
  SHARING_POSTURE_DESCRIPTION,
  SHARING_POSTURE_TITLE,
  SITES_DESCRIPTION,
  SITES_TITLE,
} from './copy'

function ReportSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function OversharingReport() {
  const { overview, isPending, isEverythingUnavailable } = useOversharingOverview()
  const consentUrl = adminConsentUrl()

  if (isPending || overview === null) {
    return (
      <ReportShell>
        <SkeletonReport />
      </ReportShell>
    )
  }

  const scopeLine =
    overview.scope === null
      ? null
      : `${formatNumber(overview.scope.sites)} sites · ${formatNumber(overview.scope.files)} files · ${formatNumber(
          overview.scope.groupConnectedSites,
        )} group-connected`

  return (
    <ReportShell
      tenantName={overview.tenant?.displayName}
      asOf={overview.reportRefreshDate ?? undefined}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">{REPORT_TITLE}</h1>
        <p className="text-sm text-muted-foreground">{REPORT_DESCRIPTION}</p>
        {scopeLine && <p className="text-sm text-ink-soft tabular">{scopeLine}</p>}
      </div>

      {overview.caveats.namesAreConcealed && <ConcealedNamesBanner />}

      {isEverythingUnavailable ? (
        <UnavailablePanel
          what="This report"
          reason={overview.unavailable[0]?.reason ?? 'unknown'}
          requiredRole="Reports Reader or SharePoint Administrator"
          requiredScope="the scopes this app requests"
          adminConsentUrl={consentUrl}
        />
      ) : (
        <>
          <RiskSummary overview={overview} adminConsentUrl={consentUrl} />

          <InsightCallout status="watch" message={OVERSHARING_BANNER} />

          <ReportSection title={BROAD_SHARING_TITLE} description={BROAD_SHARING_DESCRIPTION}>
            <BroadSharing overview={overview} adminConsentUrl={consentUrl} />
          </ReportSection>

          <ReportSection title={EXTERNAL_ACCESS_TITLE} description={EXTERNAL_ACCESS_DESCRIPTION}>
            <ExternalAccess overview={overview} adminConsentUrl={consentUrl} />
          </ReportSection>

          <ReportSection title={SHARING_POSTURE_TITLE} description={SHARING_POSTURE_DESCRIPTION}>
            <SharingPosture overview={overview} adminConsentUrl={consentUrl} />
          </ReportSection>

          <ReportSection title={SITES_TITLE} description={SITES_DESCRIPTION}>
            <Sites overview={overview} adminConsentUrl={consentUrl} />
          </ReportSection>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Figures from the Microsoft 365 usage reports count <strong>sharing links</strong>, not files, and are as of{' '}
        {overview.reportRefreshDate ?? 'the last report refresh'}
        {overview.caveats.reportLagDays !== null && ` (${formatNumber(overview.caveats.reportLagDays)} days ago)`}.
        Directory and tenant settings are read live.
      </p>

      <ClosingBand callCount={GRAPH_CALL_COUNT} />
    </ReportShell>
  )
}
