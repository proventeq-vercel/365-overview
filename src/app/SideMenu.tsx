import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import type { ReportDefinition } from '@/features/registry'
import { cn } from '@/lib/utils'

export const SIDE_MENU_ID = 'reports-menu'

const PUSH_LAYOUT_QUERY = '(min-width: 1024px)'

function isCurrent(report: ReportDefinition, pathname: string, fallback: ReportDefinition): boolean {
  return pathname === report.path || (pathname === '/' && report.id === fallback.id)
}

function pushesContent(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(PUSH_LAYOUT_QUERY).matches
}

export function SideMenu({
  reports,
  open,
  onClose,
}: {
  reports: readonly ReportDefinition[]
  open: boolean
  onClose: () => void
}) {
  const t = useTranslation()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onNavigate = () => {
    if (!pushesContent()) onClose()
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-p365-navy/40 transition-opacity duration-200 ease-out lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        data-state={open ? 'open' : 'closed'}
        inert={!open}
        className={cn(
          'fixed inset-y-14 left-0 z-40 shrink-0 overflow-hidden motion-reduce:transition-none lg:sticky lg:top-14 lg:z-auto lg:h-[calc(100vh-3.5rem)] lg:self-start',
          open
            ? 'visible w-70 [transition:width_260ms_cubic-bezier(0.4,0,0.2,1),visibility_0s]'
            : 'invisible w-0 [transition:width_260ms_cubic-bezier(0.4,0,0.2,1),visibility_0s_linear_260ms]',
        )}
      >
        <nav
          id={SIDE_MENU_ID}
          aria-label={t('app.reports')}
          className="flex h-full w-70 flex-col p-3"
        >
          <div className="flex flex-1 flex-col rounded-xl bg-p365-navy p-4 text-white shadow-float">
            <p className="px-2 text-xs font-semibold tracking-wide text-white/60 uppercase">
              {t('app.reports')}
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {reports.map((report) => {
                const Icon = report.icon
                const current = isCurrent(report, pathname, reports[0])
                return (
                  <li key={report.id}>
                    <Link
                      to={report.path}
                      onClick={onNavigate}
                      aria-current={current ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-2 text-[0.95rem] whitespace-nowrap text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-p365-teal',
                        current && 'bg-white/10 text-white',
                      )}
                    >
                      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                      {t(report.titleKey)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
      </div>
    </>
  )
}
