import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { readAllowedOrigins } from '../proxy/config.js'
import { createProxyDeps } from '../proxy/deps.js'
import { ProxyError, type ProxyResponse } from '../proxy/errors.js'
import { configurationFailure, handleProxyRequest, type ProxyDeps, type ProxyRequest } from '../proxy/handler.js'

let deps: ProxyDeps | null = null

function resolveDeps(context: InvocationContext): ProxyDeps {
  deps ??= createProxyDeps(process.env)
  return { ...deps, log: (message) => context.error(message) }
}

const toInit = (response: ProxyResponse): HttpResponseInit => ({
  status: response.status,
  headers: response.headers,
  body: response.body,
})

export async function graphProxy(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const proxyRequest: ProxyRequest = {
    method: request.method,
    url: request.url,
    header: (name) => request.headers.get(name),
    text: () => request.text(),
  }
  let resolved: ProxyDeps
  try {
    resolved = resolveDeps(context)
  } catch (error) {
    if (!(error instanceof ProxyError)) throw error
    context.error(`${error.code}: ${error.message}`)
    return toInit(configurationFailure(proxyRequest, readAllowedOrigins(process.env), error))
  }
  return toInit(await handleProxyRequest(proxyRequest, resolved))
}

app.http('graphProxy', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'graph/{*path}',
  handler: graphProxy,
})
