import { spawn, type ChildProcess } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startNodeHost } from '../local/nodeHost.js'
import { DEFAULT_LOCAL_ORIGINS, startLocalStack } from '../local/stack.js'
import { createProxyDeps } from '../src/proxy/deps.js'

const ENTRA_PORT = 7080
const GRAPH_PORT = 7090
const PROXY_PORT = 7071
const useFunctionsHost = process.argv.includes('--func')
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const stack = await startLocalStack({
  entraPort: ENTRA_PORT,
  graphPort: GRAPH_PORT,
  allowedOrigins: DEFAULT_LOCAL_ORIGINS,
  graph: { throttleFirstSiteReport: true },
})

let closeHost: () => Promise<void>
let child: ChildProcess | null = null

if (useFunctionsHost) {
  const funcBin = resolve(packageRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'func.cmd' : 'func')
  child = spawn(funcBin, ['start', '--port', String(PROXY_PORT)], {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...stack.env, FUNCTIONS_WORKER_RUNTIME: 'node', AzureWebJobsStorage: '' },
  })
  closeHost = () =>
    new Promise((done) => {
      if (!child || child.exitCode !== null) return done()
      child.once('exit', () => done())
      child.kill()
    })
} else {
  const host = await startNodeHost(createProxyDeps(stack.env, (message) => console.error(message)), PROXY_PORT)
  closeHost = host.close
}

const proxyUrl = `http://127.0.0.1:${PROXY_PORT}/api/graph`
const userToken = await stack.entra.issueUserToken()

console.log(`
Local stack up (${useFunctionsHost ? 'Azure Functions Core Tools host' : 'in-process node host'}):
  fake Entra   ${stack.entra.url}   (JWKS, token endpoint, GET /local/user-token)
  fake Graph   ${stack.graph.url}   (260 sites, 120 drives, first site report call is throttled once)
  proxy        ${proxyUrl}

Try it:
  curl -H "Authorization: Bearer ${userToken}" "${proxyUrl}/v1.0/organization"

Run the SPA against it (from the repo root, in another terminal):
  VITE_GRAPH_PROXY_URL=${proxyUrl} VITE_LOCAL_AUTH_URL=${stack.entra.url} npm run dev

Or: npm run smoke   (in functions/, exercises every call the SPA makes)
Ctrl+C stops everything.
`)

const shutdown = async () => {
  await closeHost()
  await stack.close()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
child?.on('exit', (code) => {
  console.error(`Functions host exited with ${code}`)
  void stack.close().then(() => process.exit(code ?? 1))
})
