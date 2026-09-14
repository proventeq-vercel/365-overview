import type { ReactNode } from 'react'
import { AlertTriangle, OctagonX } from 'lucide-react'
import { cn } from '@/lib/utils'

const TONES = {
  warn: { rail: 'border-l-p365-orange', icon: 'text-p365-orange', Icon: AlertTriangle },
  error: { rail: 'border-l-p365-red', icon: 'text-p365-red', Icon: OctagonX },
} as const

export function AlertPanel({
  tone,
  title,
  action,
  children,
}: {
  tone: keyof typeof TONES
  title: string
  action?: ReactNode
  children?: ReactNode
}) {
  const { rail, icon, Icon } = TONES[tone]
  return (
    <div
      role="alert"
      className={cn(
        'enter-rise flex gap-4 rounded-lg border border-p365-grey-100 border-l-[3px] bg-white px-5 py-4',
        rail,
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', icon)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="text-base font-semibold text-p365-navy">{title}</h2>
        {children}
        {action && <div className="mt-1 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  )
}
