import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { handleProxyRequest, type ProxyDeps } from '../src/proxy/handler.js'

export interface NodeHost {
  url: string
  close(): Promise<void>
}

export async function startNodeHost(deps: ProxyDeps, port = 0): Promise<NodeHost> {
  let url = ''
  const server = createServer(async (request, response) => {
    const body = await new Promise<string>((resolve) => {
      let data = ''
      request.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })
      request.on('end', () => resolve(data))
    })
    const result = await handleProxyRequest(
      {
        method: request.method ?? 'GET',
        url: new URL(request.url ?? '/', url).toString(),
        header: (name) => {
          const value = request.headers[name.toLowerCase()]
          return Array.isArray(value) ? value[0] : (value ?? null)
        },
        text: () => Promise.resolve(body),
      },
      deps,
    )
    response.writeHead(result.status, result.headers)
    response.end(result.body)
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { url, close: () => new Promise((resolve) => server.close(() => resolve())) }
}
