export type ProxyErrorCode =
  | 'InvalidConfiguration'
  | 'Unauthorized'
  | 'InvalidToken'
  | 'TenantNotAllowed'
  | 'DirectoryRoleRequired'
  | 'RouteNotAllowed'
  | 'InvalidBatch'
  | 'AdminConsentRequired'
  | 'TokenAcquisitionFailed'
  | 'GraphUnreachable'
  | 'InternalError'

export class ProxyError extends Error {
  readonly status: number
  readonly code: ProxyErrorCode

  constructor(status: number, code: ProxyErrorCode, message: string) {
    super(message)
    this.name = 'ProxyError'
    this.status = status
    this.code = code
  }
}

export interface ProxyResponse {
  status: number
  headers: Record<string, string>
  body: string
}

const SERVER_ERROR_MESSAGES: Record<string, string> = {
  InvalidConfiguration: 'The proxy is not configured correctly; an administrator must check its settings.',
  TokenAcquisitionFailed: 'The proxy could not obtain an application token from Entra.',
  GraphUnreachable: 'Microsoft Graph could not be reached.',
}

const GENERIC_SERVER_MESSAGE = 'The proxy failed unexpectedly.'

export const publicMessage = (error: ProxyError): string =>
  error.status < 500 ? error.message : (SERVER_ERROR_MESSAGES[error.code] ?? GENERIC_SERVER_MESSAGE)

export function errorResponse(error: ProxyError): ProxyResponse {
  return {
    status: error.status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code: error.code, message: publicMessage(error) } }),
  }
}
