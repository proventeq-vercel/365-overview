import { useId, useState, type ReactNode } from 'react'
import { Check, Lock, RotateCcw, Wrench, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  adminHref,
  adminResetHref,
  appliedChoice,
  isScenarioOnlyChange,
  type AdminChoice,
  type AdminDataSource,
} from '@/config/adminHref'
import type { AppEnv } from '@/config/env'
import { MOCK_SCENARIO_INFO, MOCK_SCENARIOS } from '@/config/mockScenarios'
import { FeatureFlags, type FeatureFlag } from '@/config/featureFlags'
import { MOCK_DELAYS, useMockData, type MockDataState } from '@/data/mockData'
import { useNamesConcealed } from '@/hooks/useStorageOverview'
import { useTranslation, type TranslateKey } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { useAdminBar } from './adminBarContext'

const FEATURES: readonly { flag: FeatureFlag; label: TranslateKey }[] = [
  { flag: FeatureFlags.OptimizationStorageReportOverview, label: 'reports.storageOptimisation.title' },
  { flag: FeatureFlags.OptimizationStorageReportOneDrive, label: 'reports.oneDriveUsage.title' },
  { flag: FeatureFlags.AppReportMenu, label: 'admin.feature.menu' },
]

const DATA_SOURCES: readonly AdminDataSource[] = ['live', ...MOCK_SCENARIOS]

function choiceOf(env: AdminEnv, mock: MockDataState | null): AdminChoice {
  return appliedChoice(env, env.useMock ? (mock?.scenario ?? env.mockScenario) : 'live')
}

const LIVE_SOURCE: SourceInfo = { label: 'admin.source.live' }

interface SourceInfo {
  label: TranslateKey
  description?: TranslateKey
}

function sourceInfo(source: AdminDataSource): SourceInfo {
  return source === 'live' ? LIVE_SOURCE : MOCK_SCENARIO_INFO[source]
}

function Toggle({
  pressed,
  applied,
  locked = false,
  describedBy,
  onClick,
  children,
}: {
  pressed: boolean
  applied: boolean
  locked?: boolean
  describedBy?: string
  onClick: () => void
  children: ReactNode
}) {
  const t = useTranslation()
  const pending = pressed !== applied
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-pressed={pressed}
      data-state={pressed ? 'on' : 'off'}
      data-pending={pending || undefined}
      title={pending ? t('admin.toggle.pending') : undefined}
      disabled={locked}
      aria-describedby={describedBy}
      onClick={onClick}
      className={cn(
        'gap-1.5 pr-1.5',
        pressed
          ? 'border-p365-teal bg-p365-teal text-white hover:bg-p365-teal/90 hover:text-white'
          : 'border-p365-grey-400 bg-white text-p365-grey-600',
        pending && 'border-dashed ring-2 ring-p365-yellow ring-offset-1',
        locked && 'disabled:opacity-100',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-4 items-center justify-center rounded-sm border',
          pressed ? 'border-white bg-white text-p365-teal' : 'border-p365-grey-400 bg-white',
        )}
      >
        {pressed && (locked ? <Lock className="size-2.5" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />)}
      </span>
      {children}
      <span
        aria-hidden="true"
        className={cn(
          'rounded-sm px-1 text-[0.625rem] font-bold uppercase tracking-wide',
          pressed ? 'bg-white/20 text-white' : 'bg-p365-grey-50 text-p365-grey-500',
        )}
      >
        {pressed ? t('admin.toggle.on') : t('admin.toggle.off')}
      </span>
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
  const delayId = useId()
  const concealedNoteId = useId()
  const namesConcealed = useNamesConcealed()
  const mock = useMockData()
  const current = choiceOf(env, mock)
  const [choice, setChoice] = useState(current)
  if (!open) return null

  const changed = adminHref('/', choice) !== adminHref('/', current)
  const scenarioOnly = mock !== null && isScenarioOnlyChange(choice, current)
  const apply = () => {
    if (mock && scenarioOnly && choice.data !== 'live') mock.setScenario(choice.data)
    else navigate(adminHref(window.location.pathname, choice))
  }
  const pendingCount =
    Object.values(FeatureFlags).filter((flag) => choice.features.includes(flag) !== current.features.includes(flag))
      .length +
    Number(choice.hideNames !== current.hideNames) +
    Number(choice.data !== current.data)
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
              <SelectValue>{(value: AdminDataSource) => t(sourceInfo(value).label)}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {DATA_SOURCES.map((source) => {
                const { label, description } = sourceInfo(source)
                return (
                  <SelectItem key={source} value={source} title={description && t(description)}>
                    {t(label)}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {mock && (
          <div className="flex items-center gap-1.5">
            <label htmlFor={delayId} className="text-xs font-semibold text-p365-grey-500">
              {t('admin.delay')}
            </label>
            <Select
              value={String(mock.delayMs)}
              onValueChange={(value) => mock.setDelayMs(Number(value ?? mock.delayMs))}
            >
              <SelectTrigger id={delayId} className="h-8 w-28 bg-white">
                <SelectValue>{(value: string) => t('admin.delayValue', { seconds: Number(value) / 1000 })}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {MOCK_DELAYS.map((delay) => (
                  <SelectItem key={delay} value={String(delay)}>
                    {t('admin.delayValue', { seconds: delay / 1000 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Group label={t('admin.features')}>
          {FEATURES.map(({ flag, label }) => (
            <Toggle
              key={flag}
              pressed={choice.features.includes(flag)}
              applied={current.features.includes(flag)}
              onClick={() => toggleFeature(flag)}
            >
              {t(label)}
            </Toggle>
          ))}
        </Group>

        <Group label={t('admin.names')}>
          <Toggle
            pressed={namesConcealed || choice.hideNames}
            applied={namesConcealed || current.hideNames}
            locked={namesConcealed}
            describedBy={namesConcealed ? concealedNoteId : undefined}
            onClick={() => setChoice((previous) => ({ ...previous, hideNames: !previous.hideNames }))}
          >
            {t('admin.hideNames')}
          </Toggle>
          {namesConcealed && (
            <p id={concealedNoteId} className="max-w-sm text-xs text-p365-grey-600">
              {t('admin.namesConcealed')}
            </p>
          )}
        </Group>

        <div className="ml-auto flex items-center gap-1.5">
          <span role="status" className={cn('text-xs', changed ? 'font-semibold text-p365-navy' : 'text-p365-grey-500')}>
            {changed ? t('admin.pending', { count: pendingCount }) : t('admin.applied')}
          </span>
          <Button type="button" size="sm" disabled={!changed} onClick={apply}>
            {scenarioOnly ? t('admin.applyInPlace') : t('admin.apply')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              mock?.setDelayMs(0)
              navigate(adminResetHref(window.location.pathname))
            }}
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
