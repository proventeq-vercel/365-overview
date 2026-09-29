import { describe, expect, it } from 'vitest'
import { accessModeOf } from './accessMode'
import { parseConfig } from './appConfig'

const ORIGIN = 'https://p365lite.z33.web.core.windows.net'

describe('accessModeOf', () => {
  it('reads Graph through the proxy with application permissions when a proxy URL is set', () => {
    const config = parseConfig({ VITE_GRAPH_PROXY_URL: 'https://func-lh-sa-dev.azurewebsites.net/api/graph' }, ORIGIN)
    expect(accessModeOf(config)).toBe('application')
  })

  it('reads Graph as the signed-in user with delegated permissions when no proxy is set', () => {
    const config = parseConfig({ VITE_CLIENT_ID: '0cedd025-e545-44f2-b3f8-82969e56547a' }, ORIGIN)
    expect(accessModeOf(config)).toBe('delegated')
  })
})
