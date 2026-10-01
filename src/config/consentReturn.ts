export const CONSENT_GRANTED_KEY = 'm365-overview:consentGrantedAt'

export const CONSENT_SETTLE_MS = 2 * 60 * 1000

const CONSENT_RESPONSE_PARAMS = ['admin_consent', 'tenant', 'scope', 'state', 'error', 'error_description', 'error_uri']

interface ConsentStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function sessionStore(): ConsentStore | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function takeConsentReturn(
  href: string,
  now: number,
  storage: ConsentStore | null = sessionStore(),
): string | null {
  const url = new URL(href)
  const answer = url.searchParams.get('admin_consent')
  if (answer === null) return null
  if (answer.toLowerCase() === 'true') storage?.setItem(CONSENT_GRANTED_KEY, String(now))
  for (const param of CONSENT_RESPONSE_PARAMS) url.searchParams.delete(param)
  return `${url.pathname}${url.search}${url.hash}`
}

export function consentRecentlyGranted(now: number, storage: ConsentStore | null = sessionStore()): boolean {
  const grantedAt = Number(storage?.getItem(CONSENT_GRANTED_KEY))
  return Number.isFinite(grantedAt) && grantedAt > 0 && now - grantedAt < CONSENT_SETTLE_MS
}

export function forgetConsentGrant(storage: ConsentStore | null = sessionStore()) {
  storage?.removeItem(CONSENT_GRANTED_KEY)
}
