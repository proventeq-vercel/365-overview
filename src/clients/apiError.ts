export class ApiError extends Error {
  status: number
  code: string | null
  appOnly: boolean
  constructor(status: number, message: string, code: string | null = null, appOnly = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.appOnly = appOnly
  }
  get isAuth() { return this.status === 401 || this.status === 403 }
  get isForbidden() { return this.status === 403 }
}

const CONSENT_CODES = ['AADSTS65001', 'consent_required']

export const PROXY_CONSENT_CODE = 'AdminConsentRequired'

export const PROXY_TENANT_CODE = 'TenantNotAllowed'

export const PROXY_ROLE_CODE = 'DirectoryRoleRequired'

const UNGRANTED_APPLICATION_PERMISSION = 'Authorization_RequestDenied'

export function isConsentRequired(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  if (error instanceof ApiError && error.code === PROXY_CONSENT_CODE) return true
  if (error instanceof ApiError && error.appOnly && error.code === UNGRANTED_APPLICATION_PERMISSION) return true
  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const errorCode = 'errorCode' in error && typeof error.errorCode === 'string' ? error.errorCode : ''
  const haystack = `${message} ${errorCode}`
  return CONSENT_CODES.some((code) => haystack.includes(code))
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden && (!error.appOnly || error.code === PROXY_ROLE_CODE)
}

export function isTenantNotAllowed(error: unknown): boolean {
  return error instanceof ApiError && error.code === PROXY_TENANT_CODE
}
