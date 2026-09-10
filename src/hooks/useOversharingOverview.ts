import { useQueries } from '@tanstack/react-query'
import { isConsentRequired, isForbidden } from '../clients/apiError'
import { useDataSource } from '../data/useDataSource'
import type { DataSource } from '../data/dataSource'
import { buildOversharingOverview } from '../model/oversharingOverview'
import type {
  OversharingInputs,
  OversharingOverview,
  SectionKey,
  Unavailable,
  UnavailableReason,
} from '../types/oversharing'

interface CallSpec {
  key: keyof DataSource
  section: SectionKey
}

const CALLS: CallSpec[] = [
  { key: 'getOrganization', section: 'links' },
  { key: 'getReportSettings', section: 'links' },
  { key: 'getSiteUsage', section: 'links' },
  { key: 'getSharePointActivity', section: 'sharers' },
  { key: 'getOneDriveActivity', section: 'sharers' },
  { key: 'getSharePointFileCounts', section: 'trend' },
  { key: 'getOneDriveFileCounts', section: 'trend' },
  { key: 'getGuests', section: 'guests' },
  { key: 'getUnifiedGroups', section: 'groups' },
  { key: 'getTenantSharingSettings', section: 'sharingPosture' },
  { key: 'getGuestInvitePolicy', section: 'guestPolicy' },
  { key: 'getGlobalAdminCount', section: 'globalAdmins' },
]

export const GRAPH_CALL_COUNT = CALLS.length

export function reasonFor(error: unknown): UnavailableReason {
  if (isConsentRequired(error)) return 'consent'
  if (isForbidden(error)) return 'role'
  return 'unknown'
}

function dedupe(entries: Unavailable[]): Unavailable[] {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const id = `${entry.section}:${entry.reason}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export interface OversharingReportState {
  overview: OversharingOverview | null
  isPending: boolean
  isEverythingUnavailable: boolean
}

export function useOversharingOverview(): OversharingReportState {
  const dataSource = useDataSource()

  const results = useQueries({
    queries: CALLS.map((call) => ({
      queryKey: ['oversharing', call.key],
      queryFn: () => dataSource[call.key](),
      retry: false,
      staleTime: 5 * 60 * 1000,
    })),
  })

  const isPending = results.some((result) => result.isPending)
  if (isPending) return { overview: null, isPending: true, isEverythingUnavailable: false }

  const unavailable: Unavailable[] = []
  const value = <T,>(index: number): T | null => {
    const result = results[index]
    if (result.error) {
      unavailable.push({ section: CALLS[index].section, reason: reasonFor(result.error) })
      return null
    }
    return (result.data ?? null) as T | null
  }

  const organization = value<Awaited<ReturnType<DataSource['getOrganization']>>>(0)
  const reportSettings = value<Awaited<ReturnType<DataSource['getReportSettings']>>>(1)
  const siteUsage = value<Awaited<ReturnType<DataSource['getSiteUsage']>>>(2)

  const inputs: OversharingInputs = {
    organization,
    reportSettings,
    reportRefreshDate: siteUsage?.reportRefreshDate ?? null,
    siteUsage: siteUsage?.sites ?? null,
    sharePointActivity: value(3),
    oneDriveActivity: value(4),
    sharePointFileCounts: value(5),
    oneDriveFileCounts: value(6),
    guests: value(7),
    groups: value(8),
    tenantSharing: value(9),
    guestPolicy: value(10),
    globalAdmins: value(11),
    unavailable: [],
  }

  return {
    overview: buildOversharingOverview({ ...inputs, unavailable: dedupe(unavailable) }),
    isPending: false,
    isEverythingUnavailable: unavailable.length === CALLS.length,
  }
}
