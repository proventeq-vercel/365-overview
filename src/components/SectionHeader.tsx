import type { ReactNode } from 'react'

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {children}
    </div>
  )
}
