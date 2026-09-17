export interface RawReportSettings {
  displayConcealedNames: boolean
}

export function parseReportSettings(raw: RawReportSettings): boolean {
  return raw.displayConcealedNames === true
}
