import { startFakeEntra, type FakeEntra } from './fakeEntra.js'
import { startFakeGraph, type FakeGraph, type FakeGraphOptions } from './fakeGraph.js'
import { generateLocalAppCertificate, generateLocalKeyPair, type LocalAppCertificate } from './keys.js'

export const LOCAL_GRAPH_CLIENT_ID = '0f0f0f0f-1111-4222-8333-444444444444'
export const LOCAL_PROXY_AUDIENCE = `api://${LOCAL_GRAPH_CLIENT_ID}`
export const LOCAL_PROXY_SCOPE = 'access_as_user'
export const DEFAULT_LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

const ORIGIN_ARGUMENT = '--origin='

export function allowedOriginsFrom(argv: readonly string[]): string[] {
  const named = argv
    .filter((argument) => argument.startsWith(ORIGIN_ARGUMENT))
    .map((argument) => argument.slice(ORIGIN_ARGUMENT.length).trim())
    .filter(Boolean)
  return [...DEFAULT_LOCAL_ORIGINS, ...named]
}

export interface LocalStackOptions {
  entraPort?: number
  graphPort?: number
  allowedOrigins?: string[]
  unconsentedTenantIds?: string[]
  ungrantedTenantIds?: string[]
  graph?: FakeGraphOptions
}

export interface LocalStack {
  entra: FakeEntra
  graph: FakeGraph
  appCertificate: LocalAppCertificate
  env: Record<string, string>
  close(): Promise<void>
}

export async function startLocalStack(options: LocalStackOptions = {}): Promise<LocalStack> {
  const issuerKey = await generateLocalKeyPair('local-entra-signing-key')
  const appCertificate = generateLocalAppCertificate()
  const entra = await startFakeEntra({
    issuerKey,
    app: { clientId: LOCAL_GRAPH_CLIENT_ID, certificatePem: appCertificate.certificatePem },
    proxyAudience: LOCAL_PROXY_AUDIENCE,
    proxyScope: LOCAL_PROXY_SCOPE,
    port: options.entraPort,
    unconsentedTenantIds: options.unconsentedTenantIds,
    ungrantedTenantIds: options.ungrantedTenantIds,
  })
  const graph = await startFakeGraph({ ...options.graph, port: options.graphPort })
  return {
    entra,
    graph,
    appCertificate,
    env: {
      GRAPH_CLIENT_ID: LOCAL_GRAPH_CLIENT_ID,
      GRAPH_CERT_PEM: appCertificate.pemBundle,
      PROXY_AUDIENCES: LOCAL_PROXY_AUDIENCE,
      PROXY_SCOPE: LOCAL_PROXY_SCOPE,
      PROXY_ALLOWED_ORIGINS: (options.allowedOrigins ?? DEFAULT_LOCAL_ORIGINS).join(','),
      ENTRA_AUTHORITY_HOST: entra.url,
      GRAPH_ORIGIN: graph.url,
    },
    close: async () => {
      await Promise.all([entra.close(), graph.close()])
    },
  }
}
