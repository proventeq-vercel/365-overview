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
})
