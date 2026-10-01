import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup, fireEvent } from '@testing-library/react'
import { render } from '@/test/render'
import { ApiError } from '@/clients/apiError'
import { CONSENT_GRANTED_KEY, CONSENT_SETTLE_MS } from '@/config/consentReturn'
import { AccessFailure } from './AccessFailure'

afterEach(cleanup)

describe('AccessFailure', () => {
  it('tells a consent failure to ask a Global Administrator', () => {
    render(
      <AccessFailure
        error={new ApiError(403, 'AADSTS65001: The user has not consented')}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/global administrator/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/not approved this app/i)
  })

  it('sends an admin whose tenant approved sign-in but no application permission to consent, listing the report and organisation permissions but never sites', () => {
    render(
      <AccessFailure
        error={
          new ApiError(
            403,
            'An administrator of this tenant has not granted the application permissions Reports.Read.All yet.',
            'AdminConsentRequired',
          )
        }
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/not approved this app/i)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/reports reader/i)
    const permissions = screen.getByRole('list', { name: 'Permissions the report needs' })
    expect(permissions).toHaveTextContent('Reports.Read.All')
    expect(permissions).not.toHaveTextContent('Sites.Read.All')
    expect(permissions).toHaveTextContent('Organization.Read.All')
  })

  it('shows the report loading, not the refusal, while a consent just granted settles', () => {
    sessionStorage.setItem(CONSENT_GRANTED_KEY, String(Date.now()))
    try {
      render(<AccessFailure error={new ApiError(403, 'not granted yet', 'AdminConsentRequired')} />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Loading report')).toHaveAttribute('aria-busy', 'true')
    } finally {
      sessionStorage.clear()
    }
  })

  it('shows the refusal again once the settling window has passed', () => {
    sessionStorage.setItem(CONSENT_GRANTED_KEY, String(Date.now() - CONSENT_SETTLE_MS))
    try {
      render(<AccessFailure error={new ApiError(403, 'not granted yet', 'AdminConsentRequired')} />)
      expect(screen.getByRole('alert')).toHaveTextContent(/not approved this app/i)
    } finally {
      sessionStorage.clear()
    }
  })

  it('tells a role failure to get a reporting role, not consent', () => {
    render(<AccessFailure error={new ApiError(403, 'Forbidden')} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/reports reader/i)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/global administrator/i)
  })

  it('never sends a disabled tenant off to find a directory role', () => {
    render(
      <AccessFailure
        error={new ApiError(403, 'This tenant is not enabled.', 'TenantNotAllowed')}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/not been switched on/i)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/reports reader/i)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/global administrator/i)
  })

  it('gives the two failures different headings, never one generic message', () => {
    const { unmount } = render(
      <AccessFailure error={new ApiError(403, 'AADSTS65001: not consented')} />,
    )
    const consentHeading = screen.getByRole('heading').textContent
    unmount()
    render(<AccessFailure error={new ApiError(403, 'Forbidden')} />)
    expect(screen.getByRole('heading').textContent).not.toBe(consentHeading)
  })

  it.each([
    ['consent', new ApiError(403, 'AADSTS65001: not consented')],
    ['tenant', new ApiError(403, 'This tenant is not enabled.', 'TenantNotAllowed')],
    ['role', new ApiError(403, 'Forbidden')],
  ])('links the %s failure to troubleshooting in the help', (_kind, error) => {
    render(<AccessFailure error={error} />)
    expect(screen.getByRole('link', { name: 'Troubleshooting' })).toHaveAttribute('href', '/help/getting-started/troubleshooting')
  })

  it('falls back to the generic error state for anything else', () => {
    render(<AccessFailure error={new ApiError(500, 'Server exploded')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Server exploded')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers a retry only for failures a retry could fix, never for consent or role gaps', () => {
    const onRetry = vi.fn()
    const { unmount } = render(
      <AccessFailure error={new ApiError(500, 'Server exploded')} onRetry={onRetry} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    unmount()

    render(<AccessFailure error={new ApiError(403, 'Forbidden')} onRetry={onRetry} />)
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
