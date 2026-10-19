import { describe, expect, it } from 'vitest'
import { readFeatures } from './featureFlags'
import { adminHref, adminResetHref } from './adminHref'
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

describe('adminResetHref', () => {
  it('clears the tab back to the deployed modes and keeps the admin bar', () => {
    expect(overridesOf(adminResetHref('/'))).toEqual({ admin: 'true' })
  })
})
