import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { LabelTone } from './theme'

export function Section({
  title,
  subtitle,
  delay = 0,
  children,
}: {
  title: string
  subtitle: string
  delay?: number
  children: ReactNode
}) {
  return (
    <section className="enter-rise flex flex-col gap-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-p365-navy">{title}</h2>
        <p className="text-sm text-p365-grey-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-lg border border-p365-grey-100 bg-white p-4 transition-shadow duration-200 ease-out hover:shadow-card',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PanelLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-p365-navy">{children}</h3>
}

export function PanelDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-p365-grey-500">{children}</p>
}

export function SplitGrid({ children, className }: { children: ReactNode; className: string }) {
  return <div className={cn('grid grid-cols-1 gap-4', className)}>{children}</div>
}

export function MiniStatRow({ children }: { children: ReactNode }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]">
      {children}
    </dl>
  )
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-p365-grey-50 p-3">
      <dt className="text-xs text-p365-grey-500">{label}</dt>
      <dd className="tabular text-xl font-bold text-p365-navy">{value}</dd>
    </div>
  )
}

export function Pill({ tone, children }: { tone: LabelTone; children: ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-xs font-semibold"
      style={{ color: tone.text, background: tone.background, borderColor: tone.text }}
    >
      {children}
    </span>
  )
}

export function SoftCallout({
  tone,
  pill,
  pillLabel,
  headline,
  note,
}: {
  tone: 'warn' | 'info'
  pill: LabelTone
  pillLabel: string
  headline: string
  note: string
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-2 rounded-md p-4',
        tone === 'warn' ? 'bg-p365-soft-orange' : 'bg-p365-soft-green',
      )}
    >
      <div className="flex items-start gap-2">
        <Pill tone={pill}>{pillLabel}</Pill>
        <p className="text-sm font-bold text-p365-navy">{headline}</p>
      </div>
      <p className="text-xs text-p365-grey-700">{note}</p>
    </div>
  )
}

export function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm text-p365-grey-700">
      <dt>{label}</dt>
      <dd className="tabular font-bold text-p365-navy">{value}</dd>
    </div>
  )
}

export function Legend({
  items,
  columns = 1,
  className,
}: {
  items: { name: string; color: string; detail?: string }[]
  columns?: number
  className?: string
}) {
  return (
    <ul
      className={cn('grid gap-x-4 gap-y-1.5 text-xs text-p365-grey-700', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <li key={item.name} className="flex min-w-0 items-start gap-1.5">
          <i
            className="mt-1 size-2.5 shrink-0 rounded-sm"
            style={{ background: item.color }}
            aria-hidden="true"
          />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {item.name}
            {item.detail && <span> · {item.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function EmptyBlock({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-p365-grey-100 text-xs text-p365-grey-500">
      {children}
    </div>
  )
}
