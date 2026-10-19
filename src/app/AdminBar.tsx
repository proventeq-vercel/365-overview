import { useId, useState, type ReactNode } from 'react'
import { RotateCcw, Wrench, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { adminHref, adminResetHref, type AdminChoice, type AdminDataSource } from '@/config/adminHref'
import type { AppEnv } from '@/config/env'
import { MOCK_SCENARIOS } from '@/config/mockScenarios'
import { FeatureFlags, type FeatureFlag } from '@/config/featureFlags'
import { useTranslation, type TranslateKey } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { useAdminBar } from './adminBarContext'

const FEATURES: readonly { flag: FeatureFlag; label: TranslateKey }[] = [
  { flag: FeatureFlags.OptimizationStorageReportOverview, label: 'reports.storageOptimisation.title' },
  { flag: FeatureFlags.OptimizationStorageReportOneDrive, label: 'reports.oneDriveUsage.title' },
  { flag: FeatureFlags.AppReportMenu, label: 'admin.feature.menu' },
]

const DATA_SOURCES: readonly AdminDataSource[] = ['live', ...MOCK_SCENARIOS]

function choiceOf(env: AdminEnv): AdminChoice {
  return {
    features: Object.values(FeatureFlags).filter((flag) => env.features.has(flag)),
    data: env.useMock ? env.mockScenario : 'live',
    hideNames: env.hideNames,
  }
}

function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(pressed && 'border-p365-teal bg-p365-soft-green text-p365-navy')}
    >
      {children}
    </Button>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-p365-grey-500">{label}</span>
      {children}
    </div>
  )
}

export type AdminEnv = Pick<AppEnv, 'features' | 'useMock' | 'mockScenario' | 'hideNames'>

export function AdminBar({ env, navigate }: { env: AdminEnv; navigate: (href: string) => void }) {
  const t = useTranslation()
  const { open, setOpen } = useAdminBar()
  const dataId = useId()
  const current = choiceOf(env)
  const [choice, setChoice] = useState(current)
  if (!open) return null

  const changed = adminHref('/', choice) !== adminHref('/', current)
  const toggleFeature = (flag: FeatureFlag) =>
    setChoice((previous) => ({
      ...previous,
      features: previous.features.includes(flag)
        ? previous.features.filter((feature) => feature !== flag)
        : Object.values(FeatureFlags).filter((feature) => feature === flag || previous.features.includes(feature)),
    }))

  return (
    <>
      <div aria-hidden="true" className="h-32 sm:h-24" />
      <section
        aria-label={t('admin.title')}
        className="enter-rise fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-p365-grey-100 bg-white px-4 py-3 shadow-lg"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-p365-navy">
          <Wrench aria-hidden="true" className="size-4 text-p365-teal" />
          {t('admin.title')}
        </span>

        <div className="flex items-center gap-1.5">
          <label htmlFor={dataId} className="text-xs font-semibold text-p365-grey-500">
            {t('admin.data')}
          </label>
          <Select
            value={choice.data}
            onValueChange={(value) => setChoice((previous) => ({ ...previous, data: (value ?? previous.data) as AdminDataSource }))}
          >
            <SelectTrigger id={dataId} className="h-8 w-48 bg-white">
              <SelectValue>{(value: AdminDataSource) => t(`admin.source.${value}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {DATA_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {t(`admin.source.${source}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Group label={t('admin.features')}>
          {FEATURES.map(({ flag, label }) => (
            <Toggle key={flag} pressed={choice.features.includes(flag)} onClick={() => toggleFeature(flag)}>
              {t(label)}
            </Toggle>
          ))}
        </Group>

        <Group label={t('admin.names')}>
          <Toggle
            pressed={choice.hideNames}
            onClick={() => setChoice((previous) => ({ ...previous, hideNames: !previous.hideNames }))}
          >
            {t('admin.hideNames')}
          </Toggle>
        </Group>

        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" size="sm" disabled={!changed} onClick={() => navigate(adminHref(window.location.pathname, choice))}>
            {t('admin.apply')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => navigate(adminResetHref(window.location.pathname))}
          >
            <RotateCcw aria-hidden="true" />
            {t('admin.reset')}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('admin.hide')}
            title={t('admin.hide')}
            onClick={() => setOpen(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </section>
    </>
  )
}
