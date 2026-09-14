import { Skeleton } from '@/components/ui/skeleton'
import { Panel } from './primitives'

function PanelSkeleton({ height }: { height: string }) {
  return (
    <Panel>
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className={`mt-2 ${height}`} />
    </Panel>
  )
}

export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading report">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3.5 w-full max-w-2xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-p365-grey-100 border-l-[3px] border-l-p365-grey-100 bg-white px-5 py-4">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="mt-2 h-3.5 w-24" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelSkeleton height="h-52" />
        <PanelSkeleton height="h-52" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[7fr_5fr]">
        <PanelSkeleton height="h-64" />
        <PanelSkeleton height="h-64" />
      </div>
      <PanelSkeleton height="h-72" />
    </div>
  )
}
