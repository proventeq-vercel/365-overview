import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const VIEWS = [
  { to: '/', label: 'Sneak peek' },
  { to: '/product', label: 'Product view' },
] as const

export function ViewSwitch() {
  return (
    <nav aria-label="Report view" className="flex rounded-lg border border-hairline bg-muted p-0.5 text-sm">
      {VIEWS.map((view) => (
        <NavLink
          key={view.to}
          to={view.to}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1 text-muted-foreground transition-colors',
              isActive && 'bg-surface font-semibold text-ink shadow-sm',
            )
          }
        >
          {view.label}
        </NavLink>
      ))}
    </nav>
  )
}
