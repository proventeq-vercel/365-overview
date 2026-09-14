import { describe, expect, it } from 'vitest'
import { DEFAULT_FEATURES, FeatureFlags, readFeatures } from '@/config/featureFlags'
import { translate } from '@/test/render'
import { REPORTS, enabledReports } from './registry'

describe('report registry', () => {
  it('enables only the storage overview by default, so the app runs as a single report', () => {
    expect(enabledReports(new Set(DEFAULT_FEATURES)).map((r) => r.id)).toEqual([
      'storage-optimisation',
    ])
  })

  it('enables the OneDrive report when its flag is on, keeping registry order', () => {
    const features = readFeatures(
      `${FeatureFlags.OptimizationStorageReportOneDrive},${FeatureFlags.OptimizationStorageReportOverview}`,
    )
    expect(enabledReports(features).map((r) => r.id)).toEqual([
      'storage-optimisation',
      'onedrive-usage',
    ])
  })

  it('gives every report its own flag and path', () => {
    expect(new Set(REPORTS.map((r) => r.requireFeature)).size).toBe(REPORTS.length)
    expect(new Set(REPORTS.map((r) => r.path)).size).toBe(REPORTS.length)
    expect(REPORTS.map((r) => r.requireFeature)).toEqual([
      'optimization.storage.report.overview',
      'optimization.storage.report.onedrive',
    ])
  })

  it('titles every report through the catalogue', () => {
    expect(REPORTS.map((r) => translate(r.titleKey))).toEqual(['Storage Optimisation', 'OneDrive Usage'])
  })
})
