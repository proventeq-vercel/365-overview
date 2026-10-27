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
  const values = {
    from: growth.baselineDate,
    to: growth.sizesOn,
    days: growth.windowDays,
    date: growth.sizesOn,
    read: growth.reportsRead,
    inWindow: growth.reportsInWindow,
  }
  return (
    <PanelDescription>
      {t(`storageOptimisation.offenders.explain.${growth.explanation}`, values)}
      {growth.missingNote && ` ${t(`storageOptimisation.offenders.missing.${growth.missingNote}`, values)}`}
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
