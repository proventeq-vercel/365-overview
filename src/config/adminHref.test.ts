import { describe, expect, it } from 'vitest'
import { readFeatures } from './featureFlags'
import { adminHref, adminResetHref, appliedChoice, isScenarioOnlyChange, type AdminChoice } from './adminHref'
import { readModeOverrides } from './modes'

const overridesOf = (href: string) => readModeOverrides(href.slice(href.indexOf('?')), null)

describe('adminHref', () => {
  it('turns a mock scenario, the chosen features and hidden names into the tab overrides', () => {
    const href = adminHref('/onedrive-usage', {
      features: ['optimization.storage.report.overview', 'app.menu'],
      data: 'over-entitlement',
      hideNames: true,
    })
    expect(href.startsWith('/onedrive-usage?')).toBe(true)
    expect(overridesOf(href)).toEqual({
      features: 'optimization.storage.report.overview,app.menu',
      useMock: 'true',
      mockScenario: 'over-entitlement',
      hideNames: 'true',
      admin: 'true',
    })
  })

  it('switches to live data by turning mock off and clearing the scenario and name hiding', () => {
    expect(overridesOf(adminHref('/', { features: ['optimization.storage.report.overview'], data: 'live', hideNames: false }))).toEqual({
      features: 'optimization.storage.report.overview',
      useMock: 'false',
      admin: 'true',
    })
  })

  it('says no features at all rather than falling back to the default set', () => {
    const { features } = overridesOf(adminHref('/', { features: [], data: 'live', hideNames: false }))
    expect([...readFeatures(features)]).toEqual([])
  })
})

describe('appliedChoice', () => {
  it('lists the running features in the registry order, whatever order the set holds them in', () => {
    const features = new Set(['app.menu', 'optimization.storage.report.overview'] as const)
    expect(appliedChoice({ features, hideNames: true }, 'concealed')).toEqual({
      features: ['optimization.storage.report.overview', 'app.menu'],
      data: 'concealed',
      hideNames: true,
    })
  })
})

describe('isScenarioOnlyChange', () => {
  const healthy: AdminChoice = { features: ['optimization.storage.report.overview'], data: 'healthy', hideNames: false }

  it('is a scenario-only change when only the mock scenario differs', () => {
    expect(isScenarioOnlyChange({ ...healthy, data: 'no-trends' }, healthy)).toBe(true)
  })

  it.each([
    ['nothing changed', healthy],
    ['mock to live', { ...healthy, data: 'live' }],
    ['a feature too', { ...healthy, data: 'no-trends', features: [] }],
    ['hidden names too', { ...healthy, data: 'no-trends', hideNames: true }],
  ] as const)('is not one when %s', (_case, choice) => {
    expect(isScenarioOnlyChange(choice, healthy)).toBe(false)
  })

  it('is not one from live to a mock scenario', () => {
    expect(isScenarioOnlyChange(healthy, { ...healthy, data: 'live' })).toBe(false)
  })
})

describe('adminResetHref', () => {
  it('clears the tab back to the deployed modes and keeps the admin bar', () => {
    expect(overridesOf(adminResetHref('/'))).toEqual({ admin: 'true' })
  })
})
