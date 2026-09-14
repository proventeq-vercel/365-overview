import type { ReactNode } from 'react'
import { useMsal } from '@azure/msal-react'
import {
  Bell,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  Copy,
  FilePlus,
  FileText,
  HardDrive,
  History,
  Home,
  Link2,
  Lock,
  LogOut,
  Network,
  PanelLeftClose,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { env } from '@/config/env'
import { ViewSwitch } from '@/app/ViewSwitch'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  icon: LucideIcon
  active?: boolean
  expandable?: boolean
}

interface NavGroup {
  heading: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  { heading: 'Main', items: [{ label: 'Dashboard', icon: Home }] },
  {
    heading: 'Reports',
    items: [
      { label: 'Workspace Inventory', icon: Copy },
      { label: 'Security & Oversharing', icon: Lock, expandable: true },
      { label: 'Storage Optimisation', icon: HardDrive, active: true, expandable: true },
    ],
  },
  {
    heading: 'Self service',
    items: [
      { label: 'Templates', icon: FileText },
      { label: 'New Request', icon: FilePlus },
      { label: 'Request History', icon: History },
      { label: 'Approvals', icon: CircleCheck },
    ],
  },
  {
    heading: 'Manage',
    items: [
      { label: 'Workspaces', icon: Network },
      { label: 'Connections', icon: Link2 },
    ],
  },
]

const FOOTER_ITEMS: NavItem[] = [
  { label: 'License', icon: Lock },
  { label: 'Audit log', icon: ClipboardList },
  { label: 'Tenant admins', icon: Users },
  { label: 'Settings', icon: Settings },
]

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <li
      aria-current={item.active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[0.95rem] text-white/85',
        item.active && 'bg-white/10 text-white',
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.expandable && <ChevronDown className="size-4 text-white/60" aria-hidden="true" />}
    </li>
  )
}

function SignOutRow() {
  const { instance } = useMsal()
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          void instance.logoutRedirect()
        }}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.95rem] text-white/85 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-4.5 shrink-0" aria-hidden="true" />
        Logout
      </button>
    </li>
  )
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col overflow-y-auto bg-p365-navy px-4 py-4 text-white lg:flex">
      <div className="flex items-center justify-between px-1">
        <img src="/proventeq-logo.svg" alt="Proventeq 365" className="h-7 w-auto" />
        <PanelLeftClose className="size-5 text-white/60" aria-hidden="true" />
      </div>
      <nav aria-label="Product navigation" className="mt-4 flex flex-1 flex-col">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="border-t border-white/10 py-3">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-white/60">
              {group.heading}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavRow key={item.label} item={item} />
              ))}
            </ul>
          </div>
        ))}
        <ul className="mt-auto flex flex-col gap-0.5 border-t border-white/10 pt-3">
          {FOOTER_ITEMS.map((item) => (
            <NavRow key={item.label} item={item} />
          ))}
          {!env.useMock && <SignOutRow />}
        </ul>
      </nav>
    </aside>
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function AccountChip() {
  const { accounts } = useMsal()
  const name = accounts[0]?.name
  if (!name) return null
  return (
    <div className="flex items-center gap-3">
      <span className="relative text-p365-grey-500">
        <Bell className="size-5" aria-hidden="true" />
        <span className="absolute -top-1.5 -right-2 rounded-full bg-p365-red px-1 text-[0.6rem] font-bold text-white">
          99+
        </span>
      </span>
      <span
        className="grid size-8 place-items-center rounded-full bg-p365-grey-100 text-xs font-semibold text-p365-grey-700"
        aria-hidden="true"
      >
        {initialsOf(name)}
      </span>
      <span className="text-sm text-p365-navy">{name}</span>
    </div>
  )
}

export function ProductShell({ tenantName, children }: { tenantName: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-p365-page text-p365-navy">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-p365-grey-100 bg-white px-6 py-3">
          <div className="flex flex-col gap-1">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
              <span className="text-p365-grey-600">Proventeq365</span>
              <span className="text-p365-grey-400">/</span>
              <span className="flex items-center gap-1 text-p365-teal">
                {tenantName}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </span>
              <span className="text-p365-grey-400">/</span>
              <span className="text-p365-teal">Storage Optimisation</span>
            </nav>
            <p className="flex items-center gap-2 text-xs font-semibold text-p365-grey-600">
              Storage optimisation overview
              <span className="grid size-4 place-items-center rounded-full border border-p365-grey-400 text-[0.6rem] text-p365-grey-500">
                ?
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ViewSwitch />
            {!env.useMock && <AccountChip />}
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
