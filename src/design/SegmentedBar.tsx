import type { CSSProperties, ReactElement } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { P365 } from './theme'

export interface BarSegment {
  id: string
  label: string
  color: string
  share: number
  value: string
  shareLabel: string | null
  description: string
  unmeasured?: boolean
}

const HOVER_OPEN_DELAY = 80
const HOVER_CLOSE_DELAY = 120

function swatchStyle(segment: BarSegment): CSSProperties {
  return segment.unmeasured
    ? {
        background: `repeating-linear-gradient(135deg, ${P365.grey400} 0 2px, transparent 2px 5px)`,
        boxShadow: `inset 0 0 0 1px ${P365.grey400}`,
      }
    : { background: segment.color }
}

function SegmentDetails({
  segment,
  trigger,
}: {
  segment: BarSegment
  trigger: ReactElement<Record<string, unknown>>
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={HOVER_OPEN_DELAY}
        closeDelay={HOVER_CLOSE_DELAY}
        render={trigger}
      />
      <PopoverContent>
        <div className="flex items-center gap-2">
          <i className="size-3 shrink-0 rounded-sm" style={swatchStyle(segment)} aria-hidden="true" />
          <PopoverTitle>{segment.label}</PopoverTitle>
        </div>
        <p
          className="tabular mt-1 text-lg font-bold"
          style={{ color: segment.unmeasured ? P365.grey500 : segment.color }}
        >
          {segment.value}
        </p>
        {segment.shareLabel && <p className="text-p365-grey-500">{segment.shareLabel}</p>}
        <PopoverDescription className="mt-2">{segment.description}</PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}

export function SegmentedBar({
  segments,
  ariaLabel,
  className,
}: {
  segments: BarSegment[]
  ariaLabel: string
  className?: string
}) {
  const drawn = segments.filter((segment) => segment.share > 0)
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {drawn.map((segment) => (
          <SegmentDetails
            key={segment.id}
            segment={segment}
            trigger={
              <button
                type="button"
                tabIndex={-1}
                data-segment={segment.id}
                className="h-full min-w-1 basis-0 transition-[filter] duration-150 ease-out hover:brightness-110 data-popup-open:brightness-110"
                style={{ flexGrow: segment.share, background: segment.color }}
              />
            }
          />
        ))}
      </div>
      <ul
        aria-label={ariaLabel}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
      >
        {segments.map((segment) => (
          <li key={segment.id} className="min-w-0">
            <SegmentDetails
              segment={segment}
              trigger={
                <button
                  type="button"
                  className="flex w-full min-w-0 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-p365-grey-50 focus-visible:bg-p365-grey-50 focus-visible:outline-2 focus-visible:outline-p365-teal data-popup-open:bg-p365-grey-50"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-p365-grey-700">
                    <i className="size-2.5 shrink-0 rounded-sm" style={swatchStyle(segment)} aria-hidden="true" />
                    <span className="truncate">{segment.label}</span>
                  </span>
                  <span
                    className={cn(
                      'tabular text-sm font-semibold',
                      segment.unmeasured ? 'text-p365-grey-500' : 'text-p365-navy',
                    )}
                  >
                    {segment.value}
                  </span>
                  {segment.shareLabel && (
                    <span className="tabular text-xs text-p365-grey-500">{segment.shareLabel}</span>
                  )}
                </button>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
