import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/design/Logo'
import type { ReportDefinition } from '@/features/registry'
import { cn } from '@/lib/utils'

function isCurrent(report: ReportDefinition, pathname: string, fallback: ReportDefinition): boolean {
  return pathname === report.path || (pathname === '/' && report.id === fallback.id)
}

export function FloatingMenu({
  reports,
  open,
  onClose,
}: {
  reports: readonly ReportDefinition[]
  open: boolean
  onClose: () => void
}) {
  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)
  const closeButton = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (open) {
      setRendered(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    return undefined
  }, [open])

  useEffect(() => {
    if (!visible) return undefined
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  if (!rendered) return null

  return (
    <div className="fixed inset-0 z-40" data-state={visible ? 'open' : 'closed'} inert={!visible}>
      <div
        className={cn(
          'absolute inset-0 bg-p365-navy/40 transition-opacity duration-200 ease-out',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="Reports"
        onTransitionEnd={() => {
          if (!open) setRendered(false)
        }}
        className={cn(
          'absolute inset-y-3 left-3 flex w-[280px] max-w-[calc(100vw-1.5rem)] flex-col rounded-xl bg-p365-navy p-4 text-white shadow-float transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
          visible ? 'translate-x-0' : '-translate-x-[110%]',
        )}
      >
        <div className="flex items-center justify-between px-1">
          <Logo className="h-8 text-white" />
          <Button
            ref={closeButton}
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-white/60">
          Reports
        </p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {reports.map((report) => {
            const Icon = report.icon
            const current = isCurrent(report, pathname, reports[0])
            return (
              <li key={report.id}>
                <Link
                  to={report.path}
                  onClick={onClose}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-2 text-[0.95rem] text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-p365-teal',
                    current && 'bg-white/10 text-white',
                  )}
                >
                  <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                  {report.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
