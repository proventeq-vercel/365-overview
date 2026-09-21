import { createAppTokenSource } from './appToken.js'
import { createCallerVerifier } from './callerAuth.js'
import { readConfig } from './config.js'
import type { ProxyDeps } from './handler.js'

export function createProxyDeps(
  env: Record<string, string | undefined>,
  log?: (message: string) => void,
): ProxyDeps {
  const config = readConfig(env)
  return {
    config,
    verifyCaller: createCallerVerifier(config),
    appToken: createAppTokenSource(config),
    log,
  }
}
