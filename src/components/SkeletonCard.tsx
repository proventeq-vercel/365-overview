import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function SkeletonCard() {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="flex flex-col gap-3 p-5">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-7 w-4/5" />
      </CardContent>
    </Card>
  )
}
