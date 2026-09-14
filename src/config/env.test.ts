import { afterEach, describe, it, expect, vi } from 'vitest'
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

describe('readEnv with mode overrides', () => {
  const BOTH = 'optimization.storage.report.overview,optimization.storage.report.onedrive'

  it('lets an override replace each env value', () => {
    const env = readEnv(
      { VITE_USE_MOCK: 'false', VITE_MOCK_SCENARIO: 'healthy', VITE_FEATURES: 'optimization.storage.report.overview' },
      { useMock: 'true', mockScenario: 'concealed', features: BOTH },
    )
    expect(env.useMock).toBe(true)
    expect(env.mockScenario).toBe('concealed')
    expect([...env.features]).toEqual(BOTH.split(','))
    expect(env.modesLocked).toBe(false)
    expect(env.overrides).toEqual({ useMock: 'true', mockScenario: 'concealed', features: BOTH })
  })

  it('reports no overrides when none were given', () => {
    expect(readEnv({ VITE_USE_MOCK: 'true' }).overrides).toEqual({})
  })

  it('falls back to the env for whatever the overrides leave out', () => {
    const env = readEnv({ VITE_USE_MOCK: 'true', VITE_FEATURES: BOTH }, { mockScenario: 'short-history' })
    expect(env.useMock).toBe(true)
    expect([...env.features]).toEqual(BOTH.split(','))
    expect(env.mockScenario).toBe('short-history')
  })

  it('ignores every override when VITE_MODES_LOCKED is true', () => {
    const env = readEnv(
      { VITE_MODES_LOCKED: 'true', VITE_USE_MOCK: 'false', VITE_FEATURES: 'optimization.storage.report.overview' },
      { useMock: 'true', mockScenario: 'concealed', features: BOTH },
    )
    expect(env.useMock).toBe(false)
    expect(env.mockScenario).toBe('healthy')
    expect([...env.features]).toEqual(['optimization.storage.report.overview'])
    expect(env.modesLocked).toBe(true)
    expect(env.overrides).toEqual({})
  })
})

describe('env at module load', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
  afterEach(() => {
    if (descriptor) Object.defineProperty(window, 'sessionStorage', descriptor)
    vi.resetModules()
  })

  it('boots when the browser blocks sessionStorage, still reading the URL', async () => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
    window.history.replaceState(null, '', '/?scenario=concealed')
    vi.resetModules()
    const { env } = await import('./env')
    window.history.replaceState(null, '', '/')
    expect(env.mockScenario).toBe('concealed')
  })
})
