import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import type { NameMask, StorageGrowth } from '@/types/storage'
import { MonoBarChart } from '@/design/charts'
import { EmptyBlock, Legend, PanelDescription, PanelLabel, Panel } from '@/design/primitives'
import { P365 } from '@/design/theme'

export interface GrowthState {
  data: StorageGrowth | undefined
  isError: boolean
}

function GrowthChart({ growth, nameMask }: { growth: StorageGrowth; nameMask: NameMask | null }) {
  const t = useTranslation()
  const window = { from: growth.baselineDate, to: growth.reportRefreshDate }
  return (
    <>
      <PanelDescription>
        {t('storageOptimisation.offenders.fastestSubtitle', { ...window, days: growth.windowDays })}
      </PanelDescription>
      {growth.measuredRows === 0 ? (
        <EmptyBlock>{t('storageOptimisation.offenders.fastestNotMeasured', window)}</EmptyBlock>
      ) : growth.topGrowers.length === 0 ? (
        <EmptyBlock>{t('storageOptimisation.offenders.fastestNone', window)}</EmptyBlock>
      ) : (
        <MonoBarChart
          data={growth.topGrowers.map((slice) => ({ ...slice }))}
          formatValue={formatBytes}
          ariaLabel={t('storageOptimisation.offenders.fastest')}
          nameMask={nameMask}
        />
      )}
    </>
  )
}

export function FastestGrowingPanel({ growth, nameMask }: { growth: GrowthState; nameMask: NameMask | null }) {
  const t = useTranslation()
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PanelLabel>{t('storageOptimisation.offenders.fastest')}</PanelLabel>
        <Legend items={[{ name: t('storageOptimisation.offenders.added'), color: P365.blue }]} />
      </div>
      {growth.data ? (
        <GrowthChart growth={growth.data} nameMask={nameMask} />
      ) : growth.isError ? (
        <EmptyBlock>{t('storageOptimisation.offenders.fastestUnavailable')}</EmptyBlock>
      ) : (
        <Skeleton aria-label={t('storageOptimisation.offenders.fastestLoading')} className="h-72 w-full" />
      )}
    </Panel>
  )
}
