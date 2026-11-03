import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation, type TranslateKey } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import type { GrowthRanking, NameMask, StorageGrowth, Workload } from '@/types/storage'
import { FacetBars } from '@/design/charts'
import { Legend, PanelDescription, PanelLabel, Panel } from '@/design/primitives'
import { WORKLOAD_COLOR } from '@/design/theme'

const WORKLOAD_LABEL = {
  sharePoint: 'storageOptimisation.usage.segment.sharePoint',
  teams: 'storageOptimisation.usage.segment.teams',
  oneDrive: 'table.pool.OneDrive',
} as const satisfies Record<Workload, TranslateKey>

function useRankingTitle(ranking: GrowthRanking) {
  const t = useTranslation()
  return {
    growth: t('storageOptimisation.offenders.fastest'),
    shrink: t('storageOptimisation.offenders.shrinking'),
    size: t('storageOptimisation.offenders.largest'),
  }[ranking]
}

function GrowthDescription({ growth }: { growth: StorageGrowth }) {
  const t = useTranslation()
  const values = {
    from: growth.baselineDate,
    to: growth.sizesOn,
    days: growth.windowDays,
    date: growth.sizesOn,
    windowFrom: growth.windowFrom,
    windowTo: growth.windowTo,
    inWindow: growth.daysInWindow,
    sitesRead: growth.reportsRead.sharePoint,
    drivesRead: growth.reportsRead.oneDrive,
  }
  return (
    <PanelDescription>
      {t(`storageOptimisation.offenders.explain.${growth.explanation}`, values)}
      {growth.missingNote && ` ${t('storageOptimisation.offenders.reportsRead', values)}`}
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
  const title = useRankingTitle(growth?.ranking ?? 'growth')
  const showLegend = growth !== undefined && growth.leaders.length > 0
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PanelLabel>{title}</PanelLabel>
        {showLegend && (
          <Legend
            columns={growth.workloads.length}
            items={growth.workloads.map((workload) => ({
              name: t(WORKLOAD_LABEL[workload]),
              color: WORKLOAD_COLOR[workload],
            }))}
          />
        )}
      </div>
      {growth ? (
        <>
          <GrowthDescription growth={growth} />
          <FacetBars
            items={growth.leaders.map((leader) => ({
              name: leader.name,
              value: leader.value,
              color: WORKLOAD_COLOR[leader.workload],
            }))}
            formatValue={formatBytes}
            ariaLabel={title}
            nameMask={nameMask}
            emptyText={t('storageOptimisation.offenders.empty')}
          />
        </>
      ) : (
        <Skeleton aria-label={t('storageOptimisation.offenders.fastestLoading')} className="h-72 w-full" />
      )}
    </Panel>
  )
}
