import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import type { GrowthRanking, NameMask, StorageGrowth } from '@/types/storage'
import { MonoBarChart } from '@/design/charts'
import { EmptyBlock, Legend, PanelDescription, PanelLabel, Panel } from '@/design/primitives'
import { P365 } from '@/design/theme'

function useRankingCopy(ranking: GrowthRanking) {
  const t = useTranslation()
  return {
    growth: { title: t('storageOptimisation.offenders.fastest'), legend: t('storageOptimisation.offenders.added') },
    shrink: { title: t('storageOptimisation.offenders.shrinking'), legend: t('storageOptimisation.offenders.removed') },
    size: { title: t('storageOptimisation.offenders.largest'), legend: t('storageOptimisation.offenders.used') },
  }[ranking]
}

function GrowthDescription({ growth }: { growth: StorageGrowth }) {
  const t = useTranslation()
  const window = { from: growth.baselineDate, to: growth.reportRefreshDate, days: growth.windowDays }
  const bySize = { ...window, date: growth.sizesOn }
  const description = {
    noDailyReports: () => t('storageOptimisation.offenders.largestNoDailyReports', bySize),
    notMeasured: () => t('storageOptimisation.offenders.largestNotMeasured', bySize),
    unchanged: () => t('storageOptimisation.offenders.largestUnchanged', bySize),
    growth: () => t('storageOptimisation.offenders.fastestSubtitle', window),
    shrink: () => t('storageOptimisation.offenders.shrinkingSubtitle', window),
  }[growth.sizeRankingReason ?? (growth.ranking === 'shrink' ? 'shrink' : 'growth')]()
  const partial = growth.daysRead > 0 && growth.daysRead < growth.daysAsked
  return (
    <PanelDescription>
      {description}
      {partial &&
        ` ${t('storageOptimisation.offenders.dailyReportsRead', { read: growth.daysRead, asked: growth.daysAsked })}`}
    </PanelDescription>
  )
}

export function FastestGrowingPanel({
  growth,
  nameMask,
}: {
  growth: StorageGrowth | undefined
  nameMask: NameMask | null
}) {
  const t = useTranslation()
  const copy = useRankingCopy(growth?.ranking ?? 'growth')
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PanelLabel>{copy.title}</PanelLabel>
        <Legend items={[{ name: copy.legend, color: P365.blue }]} />
      </div>
      {growth ? (
        <>
          <GrowthDescription growth={growth} />
          {growth.leaders.length === 0 ? (
            <EmptyBlock>{t('storageOptimisation.offenders.empty')}</EmptyBlock>
          ) : (
            <MonoBarChart
              data={growth.leaders.map((slice) => ({ ...slice }))}
              formatValue={formatBytes}
              ariaLabel={copy.title}
              nameMask={nameMask}
            />
          )}
        </>
      ) : (
        <Skeleton aria-label={t('storageOptimisation.offenders.fastestLoading')} className="h-72 w-full" />
      )}
    </Panel>
  )
}
