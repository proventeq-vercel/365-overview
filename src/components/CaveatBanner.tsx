import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONE_CLASS = {
  info: 'border-l-p365-teal',
  warning: 'border-l-p365-orange',
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
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-p365-grey-100 border-l-[3px] bg-white px-4 py-3',
        TONE_CLASS[tone],
      )}
    >
      <p className="min-w-0 flex-1 basis-64 text-sm text-p365-grey-700">{children}</p>
      {action}
    </div>
  )
}
