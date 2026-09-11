import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CHART_COLORS } from '@/components/charts/chartTheme'

export function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="flex flex-col gap-3 p-5">
        <h3 className="text-sm font-semibold text-ink-soft">{title}</h3>
        {children}
      </CardContent>
    </Card>
  )
}

export function SliceLegend({
  slices,
  format,
}: {
  slices: { name: string; value: number }[]
  format: (value: number) => string
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {slices.map((slice, index) => (
        <li key={slice.name} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
              aria-hidden="true"
            />
            <span className="truncate text-ink-soft">{slice.name}</span>
          </span>
          <span className="tabular whitespace-nowrap text-ink">
            {format(slice.value)}
            {total > 0 && (
              <span className="ml-2 text-muted-foreground">
                {Math.round((slice.value / total) * 100)}%
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function MiniStatRow({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</dl>
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}
