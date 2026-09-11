import { ApiError } from '@/clients/apiError'

export type AccessFailure = 'consent' | 'permission' | 'other'

const CONSENT_PATTERN = /AADSTS65001|has not consented/i

export function consentErrorFor(error: unknown): AccessFailure {
  if (!(error instanceof ApiError)) return 'other'
  if (CONSENT_PATTERN.test(error.message)) return 'consent'
  if (error.isAuth) return 'permission'
  return 'other'
}
