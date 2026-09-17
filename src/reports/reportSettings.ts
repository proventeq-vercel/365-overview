export interface RawReportSettings {
  displayConcealedNames?: unknown
}

export function parseReportSettings(raw: RawReportSettings): boolean | null {
  const value = raw.displayConcealedNames
  return typeof value === 'boolean' ? value : null
}
