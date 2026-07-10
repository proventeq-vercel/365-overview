import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InteractionStatus, type AccountInfo } from '@azure/msal-browser'
import { MsalAuthHandler } from './MsalAuthHandler'

/**
 * Pragmatic approach: mock `@azure/msal-react`'s `useMsal` so the handler can be
 * exercised without a real MsalProvider / browser MSAL instance. We control the
 * returned `instance`, `accounts`, and `inProgress` per test.
 */
const account = { homeAccountId: 'a', name: 'Ada Lovelace' } as AccountInfo

const instance = {
  getActiveAccount: vi.fn<() => AccountInfo | null>(() => account),
  setActiveAccount: vi.fn(),
  addEventCallback: vi.fn(() => 'cb-id'),
  removeEventCallback: vi.fn(),
  handleRedirectPromise: vi.fn().mockResolvedValue(null),
  loginRedirect: vi.fn().mockResolvedValue(undefined),
}

const msalState: {
  instance: typeof instance
  accounts: AccountInfo[]
  inProgress: InteractionStatus
} = {
  instance,
  accounts: [account],
  inProgress: InteractionStatus.None,
}

vi.mock('@azure/msal-react', () => ({
  useMsal: () => msalState,
}))

beforeEach(() => {
  vi.clearAllMocks()
  instance.getActiveAccount.mockReturnValue(account)
  msalState.accounts = [account]
  msalState.inProgress = InteractionStatus.None
})

describe('MsalAuthHandler', () => {
  it('renders children when an account exists and no interaction is in progress', () => {
    render(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    expect(screen.getByText('protected content')).toBeInTheDocument()
    expect(instance.loginRedirect).not.toHaveBeenCalled()
  })

  it('renders a loading screen while an interaction is in progress', () => {
    msalState.inProgress = InteractionStatus.HandleRedirect
    render(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    expect(screen.queryByText('protected content')).toBeNull()
    expect(screen.getByText('Authenticating…')).toBeInTheDocument()
  })

  it('triggers loginRedirect when there is no account', () => {
    instance.getActiveAccount.mockReturnValue(null)
    msalState.accounts = []
    render(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    expect(instance.loginRedirect).toHaveBeenCalled()
  })
})
