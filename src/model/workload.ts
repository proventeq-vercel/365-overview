import type { StorageRow, Workload } from '@/types/storage'

const TEAMS_TEMPLATE_MARKERS = ['TEAMCHANNEL', 'TEAM CHANNEL', 'GROUP']

export function classifyWorkload(template?: string): 'SharePoint' | 'Teams' {
  const upper = (template ?? '').toUpperCase()
  return TEAMS_TEMPLATE_MARKERS.some((marker) => upper.includes(marker))
    ? 'Teams'
    : 'SharePoint'
}

export function workloadOf(row: StorageRow): Workload {
  if (row.pool === 'OneDrive') return 'oneDrive'
  return classifyWorkload(row.template) === 'Teams' ? 'teams' : 'sharePoint'
}
