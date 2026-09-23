import { isConsentRequired, isForbidden, isTenantNotAllowed } from '@/clients/apiError'

export type AccessFailure = 'consent' | 'tenant' | 'permission' | 'other'

export function consentErrorFor(error: unknown): AccessFailure {
  if (isConsentRequired(error)) return 'consent'
  if (isTenantNotAllowed(error)) return 'tenant'
  if (isForbidden(error)) return 'permission'
  return 'other'
}
