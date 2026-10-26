import type { ReactNode } from 'react'

export function ShareHeadline({ share, color, children }: { share: string; color: string; children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-p365-grey-700">
      <span className="tabular text-2xl font-bold" style={{ color }}>
        {share}
      </span>
      {children}
    </p>
  )
}
