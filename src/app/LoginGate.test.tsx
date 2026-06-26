import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginGate } from './LoginGate'

/**
 * These tests use the `authenticated` prop override so MSAL is never touched.
 * The override forces the gate into a known state regardless of env/mock.
 */
describe('LoginGate', () => {
  it('renders children when authenticated', () => {
    render(
      <LoginGate authenticated={true}>
        <div>protected content</div>
      </LoginGate>,
    )
    expect(screen.getByText('protected content')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull()
  })

  it('renders a sign-in button when not authenticated', () => {
    render(
      <LoginGate authenticated={false}>
        <div>protected content</div>
      </LoginGate>,
    )
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.queryByText('protected content')).toBeNull()
  })
})
