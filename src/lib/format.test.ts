import { describe, it, expect } from 'vitest'
import { formatBytes, formatNumber } from './format'

describe('formatBytes', () => {
  it('formats units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('trims trailing .0', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('handles TB', () => {
    expect(formatBytes(1024 ** 4)).toBe('1 TB')
  })
})

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    const result = formatNumber(1000000)
    // Accept locale-specific separators (comma or period)
    expect(result).toMatch(/1[,.]000[,.]000/)
  })

  it('handles small numbers', () => {
    expect(formatNumber(42)).toBe('42')
  })
})
