import { ApiError, isConsentRequired } from '@/clients/apiError'

export type AccessFailure = 'consent' | 'permission' | 'other'

export function consentErrorFor(error: unknown): AccessFailure {
  if (isConsentRequired(error)) return 'consent'
  if (error instanceof ApiError && error.isAuth) return 'permission'
  return 'other'
}
