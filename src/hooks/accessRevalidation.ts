import { isConsentRequired, isForbidden, isTenantNotAllowed } from '../clients/apiError'

export const ACCESS_RECHECK_MS = 30 * 1000

export const CONSENT_SETTLING_RECHECK_MS = 3 * 1000

export function isAccessFailure(error: unknown): boolean {
  return isConsentRequired(error) || isTenantNotAllowed(error) || isForbidden(error)
}

export function accessRecheckInterval(error: unknown, consentJustGranted: boolean): number | false {
  if (!isAccessFailure(error)) return false
  return consentJustGranted && isConsentRequired(error) ? CONSENT_SETTLING_RECHECK_MS : ACCESS_RECHECK_MS
}
