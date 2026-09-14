import { describe, it, expect } from 'vitest'
import { readEnv } from './env'

describe('readEnv', () => {
  it("parses VITE_USE_MOCK 'true' as useMock=true", () => {
    const env = readEnv({ VITE_USE_MOCK: 'true' })
    expect(env.useMock).toBe(true)
  })

  it('treats any non-true value as useMock=false', () => {
    expect(readEnv({ VITE_USE_MOCK: 'false' }).useMock).toBe(false)
    expect(readEnv({ VITE_USE_MOCK: '1' }).useMock).toBe(false)
    expect(readEnv({}).useMock).toBe(false)
  })

  it('enables only the storage overview report unless VITE_FEATURES says otherwise', () => {
    expect([...readEnv({}).features]).toEqual(['optimization.storage.report.overview'])
    expect([
      ...readEnv({
        VITE_FEATURES: 'optimization.storage.report.overview, optimization.storage.report.onedrive',
      }).features,
    ]).toEqual(['optimization.storage.report.overview', 'optimization.storage.report.onedrive'])
  })
})

describe('readEnv mock scenario', () => {
  it('defaults to the healthy tenant', () => {
    expect(readEnv({}).mockScenario).toBe('healthy')
  })

  it('reads each supported scenario', () => {
    expect(readEnv({ VITE_MOCK_SCENARIO: 'over-entitlement' }).mockScenario).toBe(
      'over-entitlement',
    )
    expect(readEnv({ VITE_MOCK_SCENARIO: 'concealed' }).mockScenario).toBe('concealed')
    expect(readEnv({ VITE_MOCK_SCENARIO: 'short-history' }).mockScenario).toBe(
      'short-history',
    )
  })

  it('falls back to healthy for an unknown scenario rather than failing to boot', () => {
    expect(readEnv({ VITE_MOCK_SCENARIO: 'nonsense' }).mockScenario).toBe('healthy')
  })
})
