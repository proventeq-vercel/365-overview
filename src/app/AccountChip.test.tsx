import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { describe, expect, it, vi } from 'vitest'
import { AccountChip } from './AccountChip'

const msal = vi.hoisted(() => ({
  accounts: [] as { name?: string; username: string }[],
}))

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: {}, accounts: msal.accounts }),
}))

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

  it('falls back to the username when the account has no display name', () => {
    msal.accounts = [{ username: 'admin@contoso.com' }]
    render(<AccountChip />)
    expect(screen.getByText('admin@contoso.com')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
