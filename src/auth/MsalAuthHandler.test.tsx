import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { InteractionStatus, type AccountInfo } from '@azure/msal-browser'
import { MsalAuthHandler } from './MsalAuthHandler'

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

  it('shows why sign-in failed instead of sending the user straight back to Entra', async () => {
    instance.getActiveAccount.mockReturnValue(null)
    msalState.accounts = []
    msalState.inProgress = InteractionStatus.HandleRedirect
    instance.handleRedirectPromise.mockRejectedValueOnce(
      new Error('access_denied: AADSTS65004: User declined to consent to access the app.'),
    )
    const view = render(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    expect(await screen.findByText(/User declined to consent/)).toBeInTheDocument()
    msalState.inProgress = InteractionStatus.None
    view.rerender(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed')
    expect(instance.loginRedirect).not.toHaveBeenCalled()
  })

  it('stops at a login failure the MSAL event stream reports rather than redirecting again', async () => {
    instance.getActiveAccount.mockReturnValue(null)
    msalState.accounts = []
    msalState.inProgress = InteractionStatus.HandleRedirect
    const view = render(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    const [[callback]] = instance.addEventCallback.mock.calls as unknown as [[(event: unknown) => void]]
    act(() => {
      callback({
        eventType: 'msal:acquireTokenFailure',
        interactionType: 'redirect',
        error: new Error('AADSTS50105: user is not assigned'),
      })
    })
    msalState.inProgress = InteractionStatus.None
    view.rerender(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    expect(await screen.findByText(/user is not assigned/)).toBeInTheDocument()
    expect(instance.loginRedirect).not.toHaveBeenCalled()
  })

  it('keeps going after a silent token failure, which MSAL recovers from by redirecting', () => {
    instance.getActiveAccount.mockReturnValue(null)
    msalState.accounts = []
    msalState.inProgress = InteractionStatus.HandleRedirect
    const view = render(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    const [[callback]] = instance.addEventCallback.mock.calls as unknown as [[(event: unknown) => void]]
    act(() => {
      callback({
        eventType: 'msal:acquireTokenFailure',
        interactionType: 'silent',
        error: new Error('interaction_required'),
      })
    })
    msalState.inProgress = InteractionStatus.None
    view.rerender(
      <MsalAuthHandler>
        <div>protected content</div>
      </MsalAuthHandler>,
    )
    expect(screen.queryByText(/interaction_required/)).not.toBeInTheDocument()
    expect(instance.loginRedirect).toHaveBeenCalledTimes(1)
  })
})
