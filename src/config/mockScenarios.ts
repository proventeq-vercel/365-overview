import type { MockScenario } from '../data/fixtures'
import type { TranslateKey } from '../hooks/useTranslation'

export interface MockScenarioInfo {
  label: TranslateKey
  description: TranslateKey
}

export const MOCK_SCENARIO_INFO: Record<MockScenario, MockScenarioInfo> = {
  healthy: { label: 'admin.source.healthy', description: 'admin.sourceDescription.healthy' },
  'over-entitlement': {
    label: 'admin.source.over-entitlement',
    description: 'admin.sourceDescription.over-entitlement',
  },
  concealed: { label: 'admin.source.concealed', description: 'admin.sourceDescription.concealed' },
  'short-history': { label: 'admin.source.short-history', description: 'admin.sourceDescription.short-history' },
  'onedrive-over-licence': {
    label: 'admin.source.onedrive-over-licence',
    description: 'admin.sourceDescription.onedrive-over-licence',
  },
  'nothing-to-clean': {
    label: 'admin.source.nothing-to-clean',
    description: 'admin.sourceDescription.nothing-to-clean',
  },
  'no-licences': { label: 'admin.source.no-licences', description: 'admin.sourceDescription.no-licences' },
  'first-day': { label: 'admin.source.first-day', description: 'admin.sourceDescription.first-day' },
  'no-daily-reports': {
    label: 'admin.source.no-daily-reports',
    description: 'admin.sourceDescription.no-daily-reports',
  },
  'onedrive-gaps': { label: 'admin.source.onedrive-gaps', description: 'admin.sourceDescription.onedrive-gaps' },
  'no-site-report': { label: 'admin.source.no-site-report', description: 'admin.sourceDescription.no-site-report' },
  'no-onedrive-report': {
    label: 'admin.source.no-onedrive-report',
    description: 'admin.sourceDescription.no-onedrive-report',
  },
  'no-trends': { label: 'admin.source.no-trends', description: 'admin.sourceDescription.no-trends' },
  'no-sharepoint-reports': {
    label: 'admin.source.no-sharepoint-reports',
    description: 'admin.sourceDescription.no-sharepoint-reports',
  },
}

export const MOCK_SCENARIOS = Object.keys(MOCK_SCENARIO_INFO) as MockScenario[]
