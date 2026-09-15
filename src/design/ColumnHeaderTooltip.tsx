import type { ReactElement, ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ColumnHeaderTooltipProps {
  tooltip: string
  header: ReactElement
  children: ReactNode
}

export function ColumnHeaderTooltip({ tooltip, header, children }: ColumnHeaderTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={header}>{children}</TooltipTrigger>
      <TooltipContent className="max-w-72 text-left leading-snug font-normal">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
