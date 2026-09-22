import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { createProxyDeps } from '../proxy/deps.js'
import { errorResponse, ProxyError } from '../proxy/errors.js'
import { handleProxyRequest, type ProxyDeps } from '../proxy/handler.js'

let deps: ProxyDeps | null = null

function resolveDeps(context: InvocationContext): ProxyDeps {
  deps ??= createProxyDeps(process.env)
  return { ...deps, log: (message) => context.error(message) }
}

export async function graphProxy(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const response = await handleProxyRequest(
      {
        method: request.method,
        url: request.url,
        header: (name) => request.headers.get(name),
        text: () => request.text(),
      },
      resolveDeps(context),
    )
    return { status: response.status, headers: response.headers, body: response.body }
  } catch (error) {
    if (error instanceof ProxyError) {
      context.error(`${error.code}: ${error.message}`)
      const response = errorResponse(error)
      return { ...response, headers: { ...response.headers, 'cache-control': 'no-store' } }
    }
    throw error
  }
}

app.http('graphProxy', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'graph/{*path}',
  handler: graphProxy,
})
