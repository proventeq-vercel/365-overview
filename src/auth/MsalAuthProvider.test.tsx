import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { MsalAuthProvider } from './MsalAuthProvider'

const initialize = vi.fn()

vi.mock('./msalConfig', () => ({
  getMsalInstance: () => ({ initialize }),
}))

describe('MsalAuthProvider', () => {
  it('says sign-in cannot start instead of initialising forever when MSAL fails to initialise', async () => {
    initialize.mockRejectedValueOnce(new Error('crypto_nonexistent: The crypto object is unavailable.'))
    render(
      <MsalAuthProvider>
        <div>protected content</div>
      </MsalAuthProvider>,
    )
    expect(await screen.findByText(/crypto object is unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed')
    expect(screen.queryByText('protected content')).toBeNull()
  })
})
