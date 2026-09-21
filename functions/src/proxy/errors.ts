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

export function errorResponse(error: ProxyError): ProxyResponse {
  return {
    status: error.status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code: error.code, message: error.message } }),
  }
}
