import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonCard } from './SkeletonCard'

export function SkeletonReport() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading your sharing exposure">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-80" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}
