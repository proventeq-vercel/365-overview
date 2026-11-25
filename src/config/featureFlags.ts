export const FeatureFlags = {
  OptimizationStorageReportOverview: 'optimization.storage.report.overview',
  OptimizationStorageReportOneDrive: 'optimization.storage.report.onedrive',
  AppReportMenu: 'app.menu',
} as const

export type FeatureFlag = (typeof FeatureFlags)[keyof typeof FeatureFlags]

const ALL_FLAGS = new Set<string>(Object.values(FeatureFlags))

export const DEFAULT_FEATURES: readonly FeatureFlag[] = [
  FeatureFlags.OptimizationStorageReportOverview,
]

export function readFeatures(value: string | undefined): ReadonlySet<FeatureFlag> {
  if (value === undefined || value.trim() === '') return new Set(DEFAULT_FEATURES)
  const known = value
    .split(',')
    .map((flag) => flag.trim())
    .filter((flag): flag is FeatureFlag => ALL_FLAGS.has(flag))
  return new Set(known)
}
