import type { CardKey, SectionKey } from '@/types/oversharing'

export const REPORT_TITLE = 'Security & Oversharing Overview'

export const REPORT_DESCRIPTION =
  'Monitor and manage content sharing risks across your Microsoft 365 environment.'

export const BROAD_SHARING_TITLE = 'Broad Sharing'
export const BROAD_SHARING_DESCRIPTION = 'Content exposed to large or unintended audiences.'

export const EXTERNAL_ACCESS_TITLE = 'External Access'
export const EXTERNAL_ACCESS_DESCRIPTION = 'Who outside your organisation can reach your content.'

export const SHARING_POSTURE_TITLE = 'Sharing Posture'
export const SHARING_POSTURE_DESCRIPTION =
  'The tenant settings that decide how far the sharing above can go.'

export const SITES_TITLE = 'Sites'
export const SITES_DESCRIPTION = 'Every site the usage report covers, with its links side by side.'

export const OVERSHARING_BANNER =
  'Reducing oversharing lowers potential breach exposure and compliance risk.'

interface CardCopy {
  title: string
  description: string
  countDescription: (count: string, affected: string, total: string) => string
}

export const CARD_COPY: Record<CardKey, CardCopy> = {
  anyoneLinks: {
    title: 'Public or Anyone Links',
    description: 'Anyone with the link — no sign-in required, and forwardable to anyone.',
    countDescription: (_count, affected, total) => `links, on ${affected} of ${total} sites`,
  },
  organizationLinks: {
    title: 'Organization Wide Sharing',
    description: 'Links any signed-in person in your tenant can open.',
    countDescription: (_count, affected, total) => `links, on ${affected} of ${total} sites`,
  },
  externalUserAccess: {
    title: 'External User Access',
    description: 'Links issued to named guests outside your organisation.',
    countDescription: (_count, affected, total) => `links, on ${affected} of ${total} sites`,
  },
  forwardableLinks: {
    title: 'Forwardable Links',
    description: 'Anyone and organisation-wide links together — both travel wherever they are pasted.',
    countDescription: (_count, affected, total) => `links, on ${affected} of ${total} sites`,
  },
  mostSharedSites: {
    title: 'Most-shared Sites',
    description: 'Sites carrying at least one broad-audience link for every four files.',
    countDescription: (_count, _affected, total) => `of ${total} sites`,
  },
  publicGroups: {
    title: 'Sites Open to the Whole Organisation',
    description: 'Public Microsoft 365 groups — every internal user can open their site.',
    countDescription: (_count, _affected, total) => `public, of ${total} groups in the tenant`,
  },
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  links: 'Sharing links and sites',
  sharers: 'Heaviest external sharers',
  trend: 'External sharing trend',
  guests: 'Guest accounts and domains',
  groups: 'Public groups',
  sharingPosture: 'Sharing posture',
  guestPolicy: 'Guest invite policy',
  globalAdmins: 'Global administrators',
}

export const SECTION_REQUIREMENTS: Record<SectionKey, { role?: string; scope?: string }> = {
  links: { role: 'Reports Reader or SharePoint Administrator', scope: 'Reports.Read.All' },
  sharers: { role: 'Reports Reader or SharePoint Administrator', scope: 'Reports.Read.All' },
  trend: { role: 'Reports Reader or SharePoint Administrator', scope: 'Reports.Read.All' },
  guests: { scope: 'User.Read.All' },
  groups: { scope: 'Group.Read.All' },
  sharingPosture: { role: 'SharePoint Administrator or Global Reader', scope: 'SharePointTenantSettings.Read.All' },
  guestPolicy: { scope: 'Policy.Read.All' },
  globalAdmins: { scope: 'RoleManagement.Read.Directory' },
}
