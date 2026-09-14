import { describe, expect, it } from 'vitest'
import { DEFAULT_FEATURES, FeatureFlags, readFeatures } from './featureFlags'

describe('readFeatures', () => {
  it('falls back to the default set when the variable is missing or blank', () => {
    expect([...readFeatures(undefined)]).toEqual(DEFAULT_FEATURES)
    expect([...readFeatures('  ')]).toEqual(DEFAULT_FEATURES)
  })

  it('reads a comma-separated list, tolerating spaces', () => {
    expect([
      ...readFeatures(
        ` ${FeatureFlags.OptimizationStorageReportOneDrive} , ${FeatureFlags.OptimizationStorageReportOverview}`,
      ),
    ]).toEqual([
      FeatureFlags.OptimizationStorageReportOneDrive,
      FeatureFlags.OptimizationStorageReportOverview,
    ])
  })

  it('drops flags the app does not know, and an explicit list can enable nothing', () => {
    expect([...readFeatures('governance.oversharing.report.users')]).toEqual([])
    expect([
      ...readFeatures(`nonsense,${FeatureFlags.OptimizationStorageReportOverview}`),
    ]).toEqual([FeatureFlags.OptimizationStorageReportOverview])
  })

  it('uses the product naming for its flags', () => {
    expect(FeatureFlags.OptimizationStorageReportOverview).toBe(
      'optimization.storage.report.overview',
    )
    expect(FeatureFlags.OptimizationStorageReportOneDrive).toBe(
      'optimization.storage.report.onedrive',
    )
  })
})
