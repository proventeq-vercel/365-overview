import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserMenu } from './UserMenu'

const msal = vi.hoisted(() => ({
  accounts: [] as { name?: string; username: string }[],
  logoutRedirect: vi.fn(),
  loginRedirect: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: { logoutRedirect: msal.logoutRedirect, loginRedirect: msal.loginRedirect },
    accounts: msal.accounts,
  }),
}))

describe('UserMenu', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when no account is signed in', () => {
    msal.accounts = []
    const { container } = render(<UserMenu />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the user name with initials and a sign-out button that ends the MSAL session', async () => {
    msal.accounts = [{ name: 'Gov360 Automation', username: 'gov360@example.com' }]
    const user = userEvent.setup()
    render(<UserMenu />)

    expect(screen.getByText('Gov360 Automation')).toBeInTheDocument()
    expect(screen.getByText('GA')).toBeInTheDocument()
    const signOut = screen.getByRole('button', { name: /sign out/i })
    expect(signOut).toHaveAttribute('data-slot', 'button')

    await user.click(signOut)
    expect(msal.logoutRedirect).toHaveBeenCalledTimes(1)
  })

  it('falls back to the username when the account has no display name', () => {
    msal.accounts = [{ username: 'admin@contoso.com' }]
    render(<UserMenu />)
    expect(screen.getByText('admin@contoso.com')).toBeInTheDocument()
  })

  it('offers to switch account by forcing the account picker on the next sign-in', async () => {
    msal.accounts = [{ name: 'Gov360 Automation', username: 'gov360@example.com' }]
    const user = userEvent.setup()
    render(<UserMenu />)

    await user.click(screen.getByRole('button', { name: 'Switch account' }))
    expect(msal.loginRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'select_account' }),
    )
    expect(msal.logoutRedirect).not.toHaveBeenCalled()
  })
})
