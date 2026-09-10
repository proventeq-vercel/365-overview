import { describe, expect, it } from 'vitest'
import { coverageOf, severityFor, SEVERITY_LABELS } from './severity'

describe('severityFor', () => {
  it('reports no exposure when nothing was found, whatever the coverage', () => {
    expect(severityFor(0, 0)).toBe('none')
    expect(severityFor(0, 0.9)).toBe('none')
  })

  it('separates "found something, but it touches nothing" from a real spread', () => {
    expect(severityFor(12, 0)).toBe('noImmediateRisk')
    expect(severityFor(12, 0.0001)).toBe('review')
  })

  it.each([
    [0.299, 'review'],
    [0.3, 'action'],
    [0.599, 'action'],
    [0.6, 'immediate'],
    [1, 'immediate'],
  ])('grades coverage %s as %s', (coverage, expected) => {
    expect(severityFor(500, coverage)).toBe(expected)
  })

  it('treats a negative count as nothing found', () => {
    expect(severityFor(-1, 0.9)).toBe('none')
  })

  it('carries P365 wording', () => {
    expect(SEVERITY_LABELS.immediate).toBe('Immediate Action Required')
    expect(SEVERITY_LABELS.none).toBe('No Exposure Detected')
  })
})

describe('coverageOf', () => {
  it('is the affected share of the total', () => {
    expect(coverageOf(30, 120)).toBe(0.25)
  })

  it('is zero rather than NaN or Infinity when there is nothing to cover', () => {
    expect(coverageOf(0, 0)).toBe(0)
    expect(coverageOf(5, 0)).toBe(0)
  })
})
