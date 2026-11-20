import { useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type BarPattern = 'solid' | 'hatched' | 'faded'

interface BarDetails {
  label: string
  color: string
  value: string
  shareLabel: string
  description: string
}

export interface BarSegment extends BarDetails {
  id: string
  share: number
  pattern?: BarPattern
}

export interface BarRow {
  id: string
  label: string
  color: string
  value: string
  caption: string
  description: string
  scale: number
  segments: BarSegment[]
}

const HOVER_OPEN_DELAY = 80
const HOVER_CLOSE_DELAY = 120
const GROW_DURATION_MS = 400
const GROW_STAGGER_MS = 60
const GROW_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

function patternStyle(color: string, pattern: BarPattern = 'solid'): CSSProperties {
  switch (pattern) {
    case 'hatched':
      return {
        background: `repeating-linear-gradient(135deg, ${color} 0 3px, color-mix(in srgb, ${color} 35%, transparent) 3px 6px)`,
      }
    case 'faded':
      return {
        background: `color-mix(in srgb, ${color} 50%, transparent)`,
        border: `1.5px dashed ${color}`,
        boxSizing: 'border-box',
      }
    default:
      return { background: color }
  }
}

function Details({ details, trigger }: { details: BarDetails; trigger: ReactElement<Record<string, unknown>> }) {
  return (
    <Popover>
      <PopoverTrigger openOnHover delay={HOVER_OPEN_DELAY} closeDelay={HOVER_CLOSE_DELAY} render={trigger} />
      <PopoverContent>
        <div className="flex items-center gap-2">
          <i className="size-3 shrink-0 rounded-sm" style={{ background: details.color }} aria-hidden="true" />
          <PopoverTitle>{details.label}</PopoverTitle>
        </div>
        <p className="tabular mt-1 text-lg font-bold" style={{ color: details.color }}>
          {details.value}
        </p>
        <p className="text-p365-grey-500">{details.shareLabel}</p>
        <PopoverDescription className="mt-2">{details.description}</PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}

function GrowIn({ index, scale, children }: { index: number; scale: number; children: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = bar.current
    if (!element || typeof element.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    element.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: GROW_DURATION_MS,
      delay: index * GROW_STAGGER_MS,
      easing: GROW_EASING,
      fill: 'backwards',
    })
  }, [index])
  return (
    <div
      ref={bar}
      data-bar-scale={scale}
      className="flex h-full origin-left gap-0.5 overflow-hidden rounded-full"
      style={{ width: `${scale * 100}%` }}
    >
      {children}
    </div>
  )
}

function PartList({ row }: { row: BarRow }) {
  return (
    <ul aria-label={row.label} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {row.segments.map((segment) => (
        <li key={segment.id} className="min-w-0">
          <Details
            details={segment}
            trigger={
              <button
                type="button"
                className="flex w-full min-w-0 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-p365-grey-50 focus-visible:bg-p365-grey-50 focus-visible:outline-2 focus-visible:outline-p365-teal data-popup-open:bg-p365-grey-50"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-p365-grey-700">
                  <i
                    className="size-2.5 shrink-0 rounded-sm"
                    style={patternStyle(segment.color, segment.pattern)}
                    aria-hidden="true"
                  />
                  <span className="truncate">{segment.label}</span>
                </span>
                <span className="tabular text-sm font-semibold text-p365-navy">{segment.value}</span>
                <span className="tabular text-xs text-p365-grey-500">{segment.shareLabel}</span>
              </button>
            }
          />
        </li>
      ))}
    </ul>
  )
}

export function SegmentedBar({ rows, ariaLabel, className }: { rows: BarRow[]; ariaLabel: string; className?: string }) {
  return (
    <ul aria-label={ariaLabel} className={cn('flex flex-col gap-4', className)}>
      {rows.map((row, index) => (
        <li key={row.id} className="flex min-w-0 flex-col gap-1.5">
          <Details
            details={{ ...row, shareLabel: row.caption }}
            trigger={
              <button
                type="button"
                data-row={row.id}
                className="flex w-full min-w-0 items-baseline justify-between gap-3 rounded-md px-1 py-0.5 text-left transition-colors duration-150 ease-out hover:bg-p365-grey-50 focus-visible:bg-p365-grey-50 focus-visible:outline-2 focus-visible:outline-p365-teal data-popup-open:bg-p365-grey-50"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-p365-navy">
                  <i className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="tabular text-sm font-semibold text-p365-navy">{row.value}</span>
                  <span className="tabular text-xs text-p365-grey-500">{row.caption}</span>
                </span>
              </button>
            }
          />
          <div className="h-5 w-full overflow-hidden rounded-full bg-p365-grey-50" aria-hidden="true">
            <GrowIn index={index} scale={row.scale}>
              {row.segments
                .filter((segment) => segment.share > 0)
                .map((segment) => (
                  <Details
                    key={segment.id}
                    details={segment}
                    trigger={
                      <button
                        type="button"
                        tabIndex={-1}
                        data-segment={segment.id}
                        data-pattern={segment.pattern ?? 'solid'}
                        className="h-full min-w-0.5 basis-0 transition-[filter] duration-150 ease-out hover:brightness-110 data-popup-open:brightness-110"
                        style={{ flexGrow: segment.share, ...patternStyle(segment.color, segment.pattern) }}
                      />
                    }
                  />
                ))}
            </GrowIn>
          </div>
          {row.segments.length > 1 && <PartList row={row} />}
        </li>
      ))}
    </ul>
  )
}
