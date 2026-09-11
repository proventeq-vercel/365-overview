import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONE_CLASS = {
  info: 'border-l-sky',
  warning: 'border-l-amber',
} as const

interface Props {
  tone: keyof typeof TONE_CLASS
  action?: ReactNode
  children: ReactNode
}

export function CaveatBanner({ tone, action, children }: Props) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline border-l-4 bg-surface px-4 py-3',
        TONE_CLASS[tone],
      )}
    >
      <p className="min-w-0 flex-1 basis-64 text-sm text-ink">{children}</p>
      {action}
    </div>
  )
}
