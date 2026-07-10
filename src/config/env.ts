export interface AppEnv {
  useMock: boolean
}

export function readEnv(source: Record<string, string | undefined>): AppEnv {
  return {
    useMock: source.VITE_USE_MOCK === 'true',
  }
}

export const env: AppEnv = readEnv(
  import.meta.env as unknown as Record<string, string | undefined>,
)
