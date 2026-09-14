import { beforeEach, describe, expect, it } from 'vitest'
import { MODES_STORAGE_KEY, isModesLocked, readModeOverrides } from './modes'

const BOTH = 'optimization.storage.report.overview,optimization.storage.report.onedrive'

beforeEach(() => sessionStorage.clear())

describe('readModeOverrides', () => {
  it('returns nothing when the URL carries no mode params and nothing is stored', () => {
    expect(readModeOverrides('', sessionStorage)).toEqual({})
    expect(sessionStorage.getItem(MODES_STORAGE_KEY)).toBeNull()
  })

  it('reads features, mock and scenario from the search params and remembers them for the tab', () => {
    const overrides = readModeOverrides(`?features=${BOTH}&mock=true&scenario=concealed`, sessionStorage)
    expect(overrides).toEqual({ features: BOTH, useMock: 'true', mockScenario: 'concealed' })
    expect(JSON.parse(sessionStorage.getItem(MODES_STORAGE_KEY)!)).toEqual(overrides)
  })

  it('serves the remembered overrides on a later navigation without params', () => {
    readModeOverrides(`?features=${BOTH}`, sessionStorage)
    expect(readModeOverrides('', sessionStorage)).toEqual({ features: BOTH })
    expect(readModeOverrides('?utm_source=mail', sessionStorage)).toEqual({ features: BOTH })
  })

  it('changes only the params present, keeping the other remembered overrides', () => {
    readModeOverrides(`?features=${BOTH}&scenario=concealed`, sessionStorage)
    expect(readModeOverrides('?scenario=short-history', sessionStorage)).toEqual({
      features: BOTH,
      mockScenario: 'short-history',
    })
  })

  it('clears a single override with an empty value', () => {
    readModeOverrides(`?features=${BOTH}&mock=true`, sessionStorage)
    expect(readModeOverrides('?features=', sessionStorage)).toEqual({ useMock: 'true' })
  })

  it('clears every override with modes=reset and forgets them', () => {
    readModeOverrides(`?features=${BOTH}&mock=true`, sessionStorage)
    expect(readModeOverrides('?modes=reset', sessionStorage)).toEqual({})
    expect(sessionStorage.getItem(MODES_STORAGE_KEY)).toBeNull()
    expect(readModeOverrides('', sessionStorage)).toEqual({})
  })

  it('ignores a corrupt or foreign stored value', () => {
    sessionStorage.setItem(MODES_STORAGE_KEY, '{not json')
    expect(readModeOverrides('', sessionStorage)).toEqual({})
    sessionStorage.setItem(MODES_STORAGE_KEY, JSON.stringify({ features: 1, other: 'x' }))
    expect(readModeOverrides('', sessionStorage)).toEqual({})
  })

  it('works without any storage at all', () => {
    expect(readModeOverrides('?mock=true', null)).toEqual({ useMock: 'true' })
  })
})

describe('isModesLocked', () => {
  it('is true only for the literal string true', () => {
    expect(isModesLocked({ VITE_MODES_LOCKED: 'true' })).toBe(true)
    expect(isModesLocked({ VITE_MODES_LOCKED: '1' })).toBe(false)
    expect(isModesLocked({})).toBe(false)
  })
})
