import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ChecklistState = 'done' | 'active' | 'pending'

export interface LoadingChecklistItem {
  key: string
  label: string
  state: ChecklistState
}

export interface LoadingOverlayContent {
  badge: string
  title: string
  subtitle: string
  footer: string
  step?: string
  checklist?: readonly LoadingChecklistItem[]
}

function RingSpinner() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <circle cx="32" cy="32" r="24" fill="none" className="stroke-p365-grey-100" strokeWidth="4.5" />
      <circle
        cx="32"
        cy="32"
        r="24"
        fill="none"
        className="origin-center animate-spin stroke-p365-teal"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="37.7 113.1"
      />
      <circle cx="32" cy="32" r="5.5" className="fill-p365-teal" />
    </svg>
  )
}

function OverlayBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-p365-teal/25 bg-p365-teal/8 px-3 py-0.5">
      <span className="size-1.5 animate-pulse rounded-full bg-p365-teal" aria-hidden="true" />
      <span className="text-xs font-bold tracking-[0.07em] text-p365-teal uppercase">{label}</span>
    </span>
  )
}

function StepPill({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-md border border-p365-teal/20 bg-p365-teal/6 px-4 py-2">
      <span className="size-1.5 shrink-0 rounded-full bg-p365-teal" aria-hidden="true" />
      <span className="text-left text-sm text-p365-teal">{label}</span>
    </div>
  )
}

function ChecklistMarker({ state }: { state: ChecklistState }) {
  if (state === 'active') {
    return (
      <span
        className="size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-p365-grey-100 border-t-p365-teal"
        aria-hidden="true"
      />
    )
  }
  if (state === 'done') return <Check className="size-3.5 shrink-0 text-p365-teal" strokeWidth={3} aria-hidden="true" />
  return <Circle className="size-3.5 shrink-0 text-p365-grey-100" strokeWidth={2.5} aria-hidden="true" />
}

function Checklist({ items }: { items: readonly LoadingChecklistItem[] }) {
  return (
    <ul className="flex w-full flex-col gap-1">
      {items.map(({ key, label, state }) => (
        <li
          key={key}
          data-state={state}
          aria-current={state === 'active' ? 'step' : undefined}
          className={cn(
            'flex items-center gap-2 rounded-sm px-3 py-1 text-left text-sm transition-colors duration-200 ease-out',
            state === 'pending' ? 'text-p365-grey-400' : 'bg-p365-teal/6 text-p365-grey-700',
          )}
        >
          <ChecklistMarker state={state} />
          {label}
        </li>
      ))}
    </ul>
  )
}

function WaitingDots() {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {['0s', '0.2s', '0.4s'].map((delay) => (
        <span key={delay} className="loading-dot size-1.5 rounded-full bg-p365-grey-400" style={{ animationDelay: delay }} />
      ))}
    </div>
  )
}

export function LoadingOverlay({ badge, title, subtitle, footer, step, checklist }: LoadingOverlayContent) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 bg-p365-page/75">
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] items-center justify-center px-4 pb-[18vh]">
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex w-full max-w-[22rem] flex-col items-center gap-3 rounded-lg border border-t-[3px] border-p365-grey-100 border-t-p365-teal bg-white p-6 text-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        >
          <OverlayBadge label={badge} />
          <RingSpinner />
          <p className="text-lg font-bold text-p365-navy">{title}</p>
          <p className="text-sm leading-normal text-p365-teal">{subtitle}</p>
          {checklist ? <Checklist items={checklist} /> : step && <StepPill label={step} />}
          <WaitingDots />
          <p className="text-sm leading-normal text-p365-grey-400">{footer}</p>
        </div>
      </div>
    </div>
  )
}
