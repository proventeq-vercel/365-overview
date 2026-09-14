import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrg, useStorageOverview } from '@/hooks/useStorageOverview'
import { loadSettings } from '@/lib/settings'
import { AccessFailure } from '@/sections/StorageOptimization/AccessFailure'
import { COPY } from '@/sections/StorageOptimization/copy'
import { ProductDistributionSection } from './ProductDistributionSection'
import { ProductGrowthSection } from './ProductGrowthSection'
import { ProductKpiCards } from './ProductKpiCards'
import { ProductOffendersSection } from './ProductOffendersSection'
import { ProductShell } from './ProductShell'
import { ProductPanel } from './primitives'

function SkeletonPanels({ count, height }: { count: number; height: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <ProductPanel key={i}>
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className={height} />
        </ProductPanel>
      ))}
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading report">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-p365-grey-100 bg-white px-5 py-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-2 h-3.5 w-32" />
          </div>
        ))}
      </div>
      <SkeletonPanels count={2} height="h-48" />
      <SkeletonPanels count={2} height="h-64" />
    </div>
  )
}

export function ProductStorageOptimization() {
  const [settings] = useState(() => loadSettings())
  const { data, error, isPending } = useStorageOverview(settings)
  const org = useOrg()
  const tenantName = org.data?.displayName ?? 'Your tenant'

  return (
    <ProductShell tenantName={tenantName}>
      {error ? (
        <AccessFailure error={error} />
      ) : isPending || !data ? (
        <ProductSkeleton />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-semibold text-p365-navy">Storage Optimisation</h1>
            <p className="text-sm text-p365-grey-500">
              A consolidated summary of tenant storage — where it sits today, where it is heading,
              and what drives it. Data as of {data.reportRefreshDate}. {COPY.reportLagNote}
            </p>
          </div>
          <ProductKpiCards overview={data} />
          <ProductDistributionSection overview={data} />
          <ProductGrowthSection overview={data} />
          <ProductOffendersSection overview={data} />
        </div>
      )}
    </ProductShell>
  )
}
