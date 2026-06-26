import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { env } from '../config/env'

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: '◆', end: true },
  { to: '/sharepoint', label: 'SharePoint', icon: '▦' },
  { to: '/licensing', label: 'Licensing', icon: '◷' },
  { to: '/estate', label: 'Estate', icon: '▤' },
  { to: '/exchange', label: 'Exchange', icon: '✉' },
  { to: '/azure', label: 'Azure', icon: '☁' },
]

export function Layout({ children }: { children?: ReactNode }) {
  // useMsal is always available (an MsalProvider wraps the app), but accounts is
  // empty in mock mode, so the user name and sign-out are guarded.
  const { instance, accounts } = useMsal()
  const userName = accounts[0]?.name
  const canSignOut = !env.useMock && accounts.length > 0

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark">M365</span>
          <span className="sidebar__brand-text">Overview</span>
        </div>
        <nav className="sidebar__nav" aria-label="Sections">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link${isActive ? ' nav-link--active' : ''}`
              }
            >
              <span className="nav-link__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-link__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__title">Microsoft 365 &amp; Azure Estate</div>
          <div className="topbar__account">
            {userName && <span className="topbar__user">{userName}</span>}
            {canSignOut && (
              <button
                type="button"
                className="topbar__signout"
                onClick={() => {
                  void instance.logoutRedirect()
                }}
              >
                Sign out
              </button>
            )}
          </div>
        </header>
        <main className="content">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
