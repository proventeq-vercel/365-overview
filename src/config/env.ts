export interface AppEnv {
  clientId: string
  tenantId: string
  redirectUri: string
  useMock: boolean
}

export function readEnv(source: Record<string, string | undefined>, origin: string): AppEnv {
  return {
    clientId: source.VITE_AAD_CLIENT_ID ?? '',
    tenantId: source.VITE_AAD_TENANT_ID ?? '',
    redirectUri: source.VITE_AAD_REDIRECT_URI || origin,
    useMock: source.VITE_USE_MOCK === 'true',
  }
}

export const env: AppEnv = readEnv(
  import.meta.env as unknown as Record<string, string | undefined>,
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
)
