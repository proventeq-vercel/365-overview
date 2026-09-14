import { isConsentRequired, isForbidden } from '@/clients/apiError'

export type AccessFailure = 'consent' | 'permission' | 'other'

export function consentErrorFor(error: unknown): AccessFailure {
  if (isConsentRequired(error)) return 'consent'
  if (isForbidden(error)) return 'permission'
  return 'other'
}
