import { SiteTable, type VirtualColumn } from '@/components/SiteTable'
import { formatNumber } from '@/lib/format'
import type { OversharingOverview, SiteRow } from '@/types/oversharing'
import { SectionUnavailable } from './unavailableFor'

function siteName(url: string): string {
  return url.replace(/\/$/, '').split('/').pop() || url
}

const NUMBER_CELL = 'tabular text-ink-soft'

const COLUMNS: VirtualColumn<SiteRow>[] = [
  {
    key: 'site',
    header: 'Site',
    width: 'minmax(0,2fr)',
    render: (site) => (
      <>
        <span className="block truncate font-medium text-ink">{siteName(site.siteUrl)}</span>
        <span className="block truncate text-xs text-muted-foreground" title={site.siteUrl}>
          {site.siteUrl}
        </span>
      </>
    ),
  },
  {
    key: 'owner',
    header: 'Owner',
    width: 'minmax(0,1.3fr)',
    render: (site) => <span className="block truncate text-ink-soft">{site.ownerDisplayName}</span>,
  },
  {
    key: 'anyone',
    header: 'Anyone',
    width: '90px',
    align: 'right',
    sortValue: (site) => site.anonymousLinks,
    render: (site) => <span className={NUMBER_CELL}>{formatNumber(site.anonymousLinks)}</span>,
  },
  {
    key: 'organization',
    header: 'Org-wide',
    width: '96px',
    align: 'right',
    sortValue: (site) => site.organizationLinks,
    render: (site) => <span className={NUMBER_CELL}>{formatNumber(site.organizationLinks)}</span>,
  },
  {
    key: 'guest',
    header: 'Guest',
    width: '80px',
    align: 'right',
    sortValue: (site) => site.guestLinks,
    render: (site) => <span className={NUMBER_CELL}>{formatNumber(site.guestLinks)}</span>,
  },
  {
    key: 'member',
    header: 'Member',
    width: '90px',
    align: 'right',
    sortValue: (site) => site.memberLinks,
    render: (site) => <span className={NUMBER_CELL}>{formatNumber(site.memberLinks)}</span>,
  },
  {
    key: 'linksPerFile',
    header: 'Links/file',
    width: '100px',
    align: 'right',
    sortValue: (site) => site.linksPerFile ?? -1,
    render: (site) => (
      <span className={NUMBER_CELL}>{site.linksPerFile === null ? 'no files' : site.linksPerFile.toFixed(2)}</span>
    ),
  },
  {
    key: 'files',
    header: 'Files',
    width: '90px',
    align: 'right',
    sortValue: (site) => site.fileCount,
    render: (site) => <span className={NUMBER_CELL}>{formatNumber(site.fileCount)}</span>,
  },
  {
    key: 'label',
    header: 'Label',
    width: '90px',
    render: (site) => (
      <span className="text-xs text-muted-foreground">{site.sensitivityLabelId === null ? 'None' : 'Labelled'}</span>
    ),
  },
  {
    key: 'devicePolicy',
    header: 'Device policy',
    width: 'minmax(0,1fr)',
    render: (site) => <span className="block truncate text-xs text-muted-foreground">{site.unmanagedDevicePolicy}</span>,
  },
  {
    key: 'lastActivity',
    header: 'Last activity',
    width: '110px',
    render: (site) => (
      <span className="text-xs text-muted-foreground">{site.lastActivityDate ?? 'never'}</span>
    ),
  },
]

interface SitesProps {
  overview: OversharingOverview
  adminConsentUrl: string | null
}

export function Sites({ overview, adminConsentUrl }: SitesProps) {
  if (overview.sites === null) {
    return <SectionUnavailable entries={overview.unavailable} section="links" adminConsentUrl={adminConsentUrl} />
  }
  return (
    <SiteTable
      rows={overview.sites}
      columns={COLUMNS}
      getRowKey={(site) => site.siteId}
      searchText={(site) => `${site.siteUrl} ${site.ownerDisplayName} ${site.ownerPrincipalName}`}
      defaultSortKey="anyone"
      ariaLabel="Sites and their sharing links"
      searchPlaceholder="Search site or owner"
      unitLabel="sites"
    />
  )
}
