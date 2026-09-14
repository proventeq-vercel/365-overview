import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountChip } from './AccountChip'

type Account = { name?: string; username: string }

const msal = vi.hoisted(() => ({
  accounts: [] as { name?: string; username: string }[],
  active: null as { name?: string; username: string } | null,
}))

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: { getActiveAccount: (): Account | null => msal.active },
    accounts: msal.accounts,
  }),
}))

beforeEach(() => {
  msal.active = null
})

describe('AccountChip', () => {
  it('renders nothing when no account is signed in', () => {
    msal.accounts = []
    const { container } = render(<AccountChip />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the display name with initials and reveals the sign-in address on hover', () => {
    msal.accounts = [{ name: 'Gov360 Automation', username: 'gov360@example.com' }]
    render(<AccountChip />)
    expect(screen.getByText('Gov360 Automation')).toBeInTheDocument()
    expect(screen.getByText('GA')).toBeInTheDocument()
    expect(screen.getByTitle('gov360@example.com')).toHaveTextContent('Gov360 Automation')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the active account, not merely the first cached one, after switching accounts', () => {
    msal.accounts = [
      { name: 'Gov360 Automation', username: 'gov360@example.com' },
      { name: 'Adele Vance', username: 'adele@example.com' },
    ]
    msal.active = msal.accounts[1]
    render(<AccountChip />)
    expect(screen.getByText('Adele Vance')).toBeInTheDocument()
    expect(screen.queryByText('Gov360 Automation')).not.toBeInTheDocument()
  })

  it('falls back to the username when the account has no display name', () => {
    msal.accounts = [{ username: 'admin@contoso.com' }]
    render(<AccountChip />)
    expect(screen.getByText('admin@contoso.com')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
