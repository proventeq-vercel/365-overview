export class ApiError extends Error {
  status: number
  code: string | null
  constructor(status: number, message: string, code: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
  get isAuth() { return this.status === 401 || this.status === 403 }
  get isForbidden() { return this.status === 403 }
}

const CONSENT_CODES = ['AADSTS65001', 'consent_required', 'interaction_required']

export const PROXY_CONSENT_CODE = 'AdminConsentRequired'

export function isConsentRequired(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  if (error instanceof ApiError && error.code === PROXY_CONSENT_CODE) return true
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
