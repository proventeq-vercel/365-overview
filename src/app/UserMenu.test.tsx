import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UserMenu } from './UserMenu'

const msal = vi.hoisted(() => ({
  accounts: [] as { name?: string }[],
  logoutRedirect: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: { logoutRedirect: msal.logoutRedirect }, accounts: msal.accounts }),
}))

describe('UserMenu', () => {
  it('renders nothing when no account is signed in', () => {
    msal.accounts = []
    const { container } = render(<UserMenu />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the user name and a sign-out button that ends the MSAL session', async () => {
    msal.accounts = [{ name: 'Gov360 Automation' }]
    const user = userEvent.setup()
    render(<UserMenu />)

    expect(screen.getByText('Gov360 Automation')).toBeInTheDocument()
    const signOut = screen.getByRole('button', { name: /sign out/i })
    expect(signOut).toHaveAttribute('data-slot', 'button')

    await user.click(signOut)
    expect(msal.logoutRedirect).toHaveBeenCalledTimes(1)
  })
})
