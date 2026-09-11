import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ApiError } from '@/clients/apiError'
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

  it('tells a role failure to get a reporting role, not consent', () => {
    render(<AccessFailure error={new ApiError(403, 'Forbidden')} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/reports reader/i)
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

  it('falls back to the generic error state for anything else', () => {
    render(<AccessFailure error={new ApiError(500, 'Server exploded')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Server exploded')
  })
})
