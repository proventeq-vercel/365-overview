import { describe, it, expect } from 'vitest'
import { utilizationStatus, STORAGE_THRESHOLDS } from './thresholds'

describe('utilizationStatus', () => {
  it('returns healthy below the watch threshold', () => {
    expect(utilizationStatus(80, 100, STORAGE_THRESHOLDS)).toBe('healthy')
  })
  it('returns watch at the watch threshold', () => {
    expect(utilizationStatus(85, 100, STORAGE_THRESHOLDS)).toBe('watch')
  })
  it('returns attention at the attention threshold', () => {
    expect(utilizationStatus(95, 100, STORAGE_THRESHOLDS)).toBe('attention')
  })
  it('treats zero/negative total as healthy (no divide-by-zero)', () => {
    expect(utilizationStatus(0, 0, STORAGE_THRESHOLDS)).toBe('healthy')
  })
})
