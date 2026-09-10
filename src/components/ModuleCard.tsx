import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { SeverityBar } from './SeverityBar'
import { formatNumber } from '@/lib/format'
import type { CardStat } from '@/types/oversharing'

interface ModuleCardProps {
  title: string
  description: string
  stat: CardStat | null
  countDescription: (stat: CardStat) => string
  coverageLabel: string
  unavailable?: ReactNode
}

export function ModuleCard({
  title,
  description,
  stat,
  countDescription,
  coverageLabel,
  unavailable,
}: ModuleCardProps) {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
        {stat === null ? (
          <div className="mt-auto">{unavailable}</div>
        ) : (
          <>
            <div className="mt-auto flex flex-col gap-0.5">
              <span className="text-3xl font-bold tabular text-ink">{formatNumber(stat.count)}</span>
              <span className="text-xs text-muted-foreground">{countDescription(stat)}</span>
            </div>
            <SeverityBar severity={stat.severity} coverage={stat.coverage} coverageLabel={coverageLabel} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
