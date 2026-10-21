import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import type { GrowthRanking, NameMask, StorageGrowth } from '@/types/storage'
import { FacetBars } from '@/design/charts'
import { EmptyBlock, Legend, PanelDescription, PanelLabel, Panel } from '@/design/primitives'
import { POOL_COLOR } from '@/design/theme'
import { TOP_GROWERS } from '@/model/storageGrowth'

function useRankingCopy(ranking: GrowthRanking) {
  const t = useTranslation()
  return {
    growth: { title: t('storageOptimisation.offenders.fastest') },
    shrink: { title: t('storageOptimisation.offenders.shrinking') },
    size: { title: t('storageOptimisation.offenders.largest') },
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
  const copy = useRankingCopy(growth?.ranking ?? 'growth')
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PanelLabel>{copy.title}</PanelLabel>
        {growth && growth.leaders.length > 0 && (
          <Legend
            columns={2}
            items={[
              { name: t('table.pool.SharePoint'), color: POOL_COLOR.SharePoint },
              { name: t('table.pool.OneDrive'), color: POOL_COLOR.OneDrive },
            ]}
          />
        )}
      </div>
      {growth ? (
        <>
          <GrowthDescription growth={growth} />
          {growth.leaders.length === 0 ? (
            <EmptyBlock>{t('storageOptimisation.offenders.empty')}</EmptyBlock>
          ) : (
            <FacetBars
              items={growth.leaders}
              formatValue={formatBytes}
              emptyText={t('storageOptimisation.offenders.empty')}
              ariaLabel={copy.title}
              nameMask={nameMask}
            />
          )}
        </>
      ) : (
        <div
          role="status"
          aria-busy="true"
          aria-label={t('storageOptimisation.offenders.fastestLoading')}
          className="flex flex-col gap-2.5"
        >
          <span className="sr-only">{t('storageOptimisation.offenders.fastestLoading')}</span>
          {Array.from({ length: TOP_GROWERS }, (_, index) => (
            <Skeleton key={index} className="h-7 w-full" />
          ))}
        </div>
      )}
    </Panel>
  )
}
