export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
  get isAuth() { return this.status === 401 || this.status === 403 }
  get isForbidden() { return this.status === 403 }
}

const CONSENT_CODES = ['AADSTS65001', 'consent_required', 'interaction_required']

export function isConsentRequired(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  const name = 'name' in error && typeof error.name === 'string' ? error.name : ''
  if (name === 'InteractionRequiredAuthError') return true
  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const errorCode = 'errorCode' in error && typeof error.errorCode === 'string' ? error.errorCode : ''
  const haystack = `${message} ${errorCode}`
  return CONSENT_CODES.some((code) => haystack.includes(code))
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden
}
