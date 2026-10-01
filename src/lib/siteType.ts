import type { SiteType } from '../types/oversharing'

const COMMUNICATION_TEMPLATES = ['communication', 'sitepagepublishing', 'publishing']
const TEAM_TEMPLATES = ['team site', 'sts']

export const SITE_TYPE_LABELS: Record<SiteType, string> = {
  groupConnected: 'Group-connected',
  communication: 'Communication site',
  teamSite: 'Team site',
  other: 'Other',
}

export function siteTypeOf(template: string, isGroupConnected: boolean): SiteType {
  if (isGroupConnected) return 'groupConnected'
  const normalized = template.trim().toLowerCase()
  if (COMMUNICATION_TEMPLATES.some((candidate) => normalized.includes(candidate))) {
    return 'communication'
  }
  if (TEAM_TEMPLATES.some((candidate) => normalized.includes(candidate))) return 'teamSite'
  return 'other'
}
