export type Severity = 'none' | 'noImmediateRisk' | 'review' | 'action' | 'immediate'

export const COVERAGE_REVIEW = 0.3
export const COVERAGE_ACTION = 0.6

export const SEVERITY_LABELS: Record<Severity, string> = {
  none: 'No Exposure Detected',
  noImmediateRisk: 'No Immediate Risk',
  review: 'Review Recommended',
  action: 'Action Required',
  immediate: 'Immediate Action Required',
}

export const SEVERITY_COLORS: Record<Severity, string> = {
  none: '#34a1a0',
  noImmediateRisk: '#34a1a0',
  review: '#eab000',
  action: '#f98d50',
  immediate: '#c2410c',
}

export function severityFor(count: number, coverage: number): Severity {
  if (count <= 0) return 'none'
  if (coverage <= 0) return 'noImmediateRisk'
  if (coverage < COVERAGE_REVIEW) return 'review'
  if (coverage < COVERAGE_ACTION) return 'action'
  return 'immediate'
}

export function coverageOf(affected: number, total: number): number {
  if (total <= 0) return 0
  return affected / total
}
