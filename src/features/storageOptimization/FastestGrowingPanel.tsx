import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import type { NameMask, StorageGrowth } from '@/types/storage'
import { FacetBars } from '@/design/charts'
import { EmptyBlock, Legend, PanelDescription, PanelLabel, Panel } from '@/design/primitives'
import { POOL_COLOR } from '@/design/theme'
import { TOP_GROWERS } from '@/model/storageGrowth'

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
      <FacetBars
        items={growth.topGrowers}
        formatValue={formatBytes}
        emptyText={t('storageOptimisation.offenders.fastestNone', window)}
        ariaLabel={t('storageOptimisation.offenders.fastest')}
        nameMask={nameMask}
      />
    </>
  )
}

export function FastestGrowingPanel({ growth, nameMask }: { growth: GrowthState; nameMask: NameMask | null }) {
  const t = useTranslation()
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PanelLabel>{t('storageOptimisation.offenders.fastest')}</PanelLabel>
        {growth.data && growth.data.topGrowers.length > 0 && (
          <Legend
            columns={2}
            items={[
              { name: t('table.pool.SharePoint'), color: POOL_COLOR.SharePoint },
              { name: t('table.pool.OneDrive'), color: POOL_COLOR.OneDrive },
            ]}
          />
        )}
      </div>
      {growth.data ? (
        <GrowthChart growth={growth.data} nameMask={nameMask} />
      ) : growth.isError ? (
        <EmptyBlock>{t('storageOptimisation.offenders.fastestUnavailable')}</EmptyBlock>
      ) : (
        <div aria-label={t('storageOptimisation.offenders.fastestLoading')} className="flex flex-col gap-2.5">
          {Array.from({ length: TOP_GROWERS }, (_, index) => (
            <Skeleton key={index} className="h-7 w-full" />
          ))}
        </div>
      )}
    </Panel>
  )
}
