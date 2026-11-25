import { createContext, useContext } from 'react'
import { MOCK_DELAY_STORAGE_KEY } from '@/config/modes'
import type { MockScenario } from './fixtures'

export const MOCK_DELAYS: readonly number[] = [0, 800, 2000, 5000]

export interface MockDataState {
  scenario: MockScenario
  delayMs: number
  setScenario: (scenario: MockScenario) => void
  setDelayMs: (delayMs: number) => void
}

export const MockDataContext = createContext<MockDataState | null>(null)

export function useMockData(): MockDataState | null {
  return useContext(MockDataContext)
}

export function readMockDelay(): number {
  try {
    const stored = Number(window.sessionStorage.getItem(MOCK_DELAY_STORAGE_KEY))
    return MOCK_DELAYS.find((delay) => delay === stored) ?? 0
  } catch {
    return 0
  }
}

export function rememberMockDelay(delayMs: number) {
  try {
    if (delayMs === 0) window.sessionStorage.removeItem(MOCK_DELAY_STORAGE_KEY)
    else window.sessionStorage.setItem(MOCK_DELAY_STORAGE_KEY, String(delayMs))
  } catch {
    return
  }
}
