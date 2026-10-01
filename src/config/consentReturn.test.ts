import { describe, expect, it } from 'vitest'
import {
  CONSENT_GRANTED_KEY,
  CONSENT_SETTLE_MS,
  consentRecentlyGranted,
  forgetConsentGrant,
  takeConsentReturn,
} from './consentReturn'

const NOW = 1_759_300_000_000

function memoryStore() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  }
}

describe('takeConsentReturn', () => {
  it('records an approval and strips the consent response from the address', () => {
    const store = memoryStore()
    const cleaned = takeConsentReturn(
      'https://p365lite.example/?admin_consent=True&tenant=8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718&scope=https%3A%2F%2Fgraph.microsoft.com%2FReports.Read.All',
      NOW,
      store,
    )
    expect(cleaned).toBe('/')
    expect(store.getItem(CONSENT_GRANTED_KEY)).toBe(String(NOW))
  })

  it('keeps the rest of the address intact', () => {
    expect(takeConsentReturn('https://p365lite.example/onedrive-usage?hideNames=true&admin_consent=True#top', NOW, memoryStore())).toBe(
      '/onedrive-usage?hideNames=true#top',
    )
  })

  it('cleans up a declined consent without recording an approval', () => {
    const store = memoryStore()
    expect(
      takeConsentReturn('https://p365lite.example/?admin_consent=False&error=access_denied&error_description=declined', NOW, store),
    ).toBe('/')
    expect(store.getItem(CONSENT_GRANTED_KEY)).toBeNull()
  })

  it('leaves an ordinary address alone', () => {
    const store = memoryStore()
    expect(takeConsentReturn('https://p365lite.example/?error=boom', NOW, store)).toBeNull()
    expect(store.getItem(CONSENT_GRANTED_KEY)).toBeNull()
  })
})

describe('consentRecentlyGranted', () => {
  it('holds for the settling window after the approval and lapses after it', () => {
    const store = memoryStore()
    store.setItem(CONSENT_GRANTED_KEY, String(NOW))
    expect(consentRecentlyGranted(NOW + CONSENT_SETTLE_MS - 1, store)).toBe(true)
    expect(consentRecentlyGranted(NOW + CONSENT_SETTLE_MS, store)).toBe(false)
  })

  it('is false with no record, a garbled one or no storage at all', () => {
    const store = memoryStore()
    expect(consentRecentlyGranted(NOW, store)).toBe(false)
    store.setItem(CONSENT_GRANTED_KEY, 'soon')
    expect(consentRecentlyGranted(NOW, store)).toBe(false)
    expect(consentRecentlyGranted(NOW, null)).toBe(false)
  })

  it('is false once the grant is forgotten', () => {
    const store = memoryStore()
    store.setItem(CONSENT_GRANTED_KEY, String(NOW))
    forgetConsentGrant(store)
    expect(consentRecentlyGranted(NOW, store)).toBe(false)
  })
})
