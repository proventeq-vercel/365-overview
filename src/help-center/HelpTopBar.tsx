import type { ReactNode, Ref } from 'react'
import { MenuIcon } from './icons'
import type { HelpCenterLabels } from './labels'

export function HelpTopBar({
  brand,
  search,
  actions,
  navOpen,
  sidebarId,
  toggleRef,
  labels,
  onToggleNav,
}: {
  brand?: ReactNode
  search: ReactNode
  actions?: ReactNode
  navOpen: boolean
  sidebarId: string
  toggleRef?: Ref<HTMLButtonElement>
  labels: HelpCenterLabels
  onToggleNav: () => void
}) {
  return (
    <header className="hc-topbar">
      <div className="hc-topbar-inner">
        <button
          ref={toggleRef}
          type="button"
          className="hc-icon-button hc-browse"
          aria-label={labels.browse}
          aria-expanded={navOpen}
          aria-controls={sidebarId}
          onClick={onToggleNav}
        >
          <MenuIcon size={18} />
        </button>
        <div className="hc-brand">{brand}</div>
        <div className="hc-topbar-end">
          {search}
          {actions}
        </div>
      </div>
    </header>
  )
}
