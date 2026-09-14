const MODE_PARAMS = {
  features: 'features',
  useMock: 'mock',
  mockScenario: 'scenario',
} as const

export const MODES_RESET_PARAM = 'modes'
export const MODES_RESET_VALUE = 'reset'
export const MODES_STORAGE_KEY = 'm365-overview:modes'

export type ModeKey = keyof typeof MODE_PARAMS
export type ModeOverrides = Partial<Record<ModeKey, string>>

type OverrideStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function tabStorage(): OverrideStore | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function stored(storage: OverrideStore | null): ModeOverrides {
  try {
    const raw = storage?.getItem(MODES_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const overrides: ModeOverrides = {}
    for (const key of Object.keys(MODE_PARAMS) as ModeKey[]) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'string') overrides[key] = value
    }
    return overrides
  } catch {
    return {}
  }
}

function persist(storage: OverrideStore | null, overrides: ModeOverrides) {
  if (!storage) return
  try {
    if (Object.keys(overrides).length === 0) storage.removeItem(MODES_STORAGE_KEY)
    else storage.setItem(MODES_STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    return
  }
}

export function isModesLocked(source: Record<string, string | undefined>): boolean {
  return source.VITE_MODES_LOCKED === 'true'
}

export function readModeOverrides(search: string, storage: OverrideStore | null): ModeOverrides {
  const params = new URLSearchParams(search)
  if (params.get(MODES_RESET_PARAM) === MODES_RESET_VALUE) {
    persist(storage, {})
    return {}
  }
  const overrides = stored(storage)
  let changed = false
  for (const [key, param] of Object.entries(MODE_PARAMS) as [ModeKey, string][]) {
    const value = params.get(param)
    if (value === null) continue
    changed = true
    if (value.trim() === '') delete overrides[key]
    else overrides[key] = value.trim()
  }
  if (changed) persist(storage, overrides)
  return overrides
}
