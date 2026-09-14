import { useMsal } from '@azure/msal-react'

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function AccountChip() {
  const { instance, accounts } = useMsal()
  const account = instance.getActiveAccount() ?? accounts[0]
  if (!account) return null
  const name = account.name ?? account.username

  return (
    <span className="flex items-center gap-2" title={account.username}>
      <span
        className="grid size-8 place-items-center rounded-full bg-p365-grey-100 text-xs font-semibold text-p365-grey-700"
        aria-hidden="true"
      >
        {initialsOf(name)}
      </span>
      <span className="hidden max-w-48 truncate text-sm text-p365-navy sm:inline">{name}</span>
    </span>
  )
}
