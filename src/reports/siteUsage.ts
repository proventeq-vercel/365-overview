import type { SiteRow } from '../types/oversharing'
import { bool, dateOrNull, num, text } from './graphValues'

export interface RawSiteUsageRow {
  reportRefreshDate?: string
  siteId?: string
  siteUrl?: string
  ownerDisplayName?: string
  ownerPrincipalName?: string
  rootWebTemplate?: string
  fileCount?: number | string
  activeFileCount?: number | string
  anonymousLinkCount?: number | string
  companyLinkCount?: number | string
  secureLinkForGuestCount?: number | string
  secureLinkForMemberCount?: number | string
  externalSharing?: boolean | string
  siteSensitivityLabelId?: string
  unmanagedDevicePolicy?: string
  lastActivityDate?: string
  isDeleted?: boolean | string
}

const GROUP_TEMPLATES = ['group', 'teamchannel']

export function isGroupConnectedTemplate(template: string): boolean {
  const normalized = template.trim().toLowerCase()
  return GROUP_TEMPLATES.some((t) => normalized.includes(t))
}

export function parseSiteUsage(rows: RawSiteUsageRow[]): SiteRow[] {
  return rows.map((row) => {
    const fileCount = num(row.fileCount)
    const anonymousLinks = num(row.anonymousLinkCount)
    const organizationLinks = num(row.companyLinkCount)
    const guestLinks = num(row.secureLinkForGuestCount)
    const memberLinks = num(row.secureLinkForMemberCount)
    const template = text(row.rootWebTemplate)
    const sensitivityLabelId = text(row.siteSensitivityLabelId).trim()
    return {
      siteId: text(row.siteId),
      siteUrl: text(row.siteUrl),
      template,
      isGroupConnected: isGroupConnectedTemplate(template),
      ownerDisplayName: text(row.ownerDisplayName),
      ownerPrincipalName: text(row.ownerPrincipalName),
      fileCount,
      activeFileCount: num(row.activeFileCount),
      lastActivityDate: dateOrNull(row.lastActivityDate),
      isDeleted: bool(row.isDeleted),
      anonymousLinks,
      organizationLinks,
      guestLinks,
      memberLinks,
      externalSharingEnabled: bool(row.externalSharing),
      sensitivityLabelId: sensitivityLabelId === '' ? null : sensitivityLabelId,
      unmanagedDevicePolicy: text(row.unmanagedDevicePolicy),
      linksPerFile:
        fileCount > 0
          ? (anonymousLinks + organizationLinks + guestLinks + memberLinks) / fileCount
          : null,
    }
  })
}

export function reportRefreshDateOf(rows: RawSiteUsageRow[]): string | null {
  for (const row of rows) {
    const date = dateOrNull(row.reportRefreshDate)
    if (date) return date
  }
  return null
}
