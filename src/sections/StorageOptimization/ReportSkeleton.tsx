import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function SkeletonPanel({ height }: { height: string }) {
  return (
    <Card className="h-full border-hairline shadow-none">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className={height} />
      </CardContent>
    </Card>
  )
}

function SkeletonSection({ panels }: { panels: number }) {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-3.5 w-96 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: panels }).map((_, i) => (
          <SkeletonPanel key={i} height="h-48" />
        ))}
      </div>
    </div>
  )
}

export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading report">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonSection panels={3} />
      <SkeletonSection panels={2} />
    </div>
  )
}
