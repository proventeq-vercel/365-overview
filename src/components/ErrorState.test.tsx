import { describe, it, expect } from 'vitest'
import { render } from '@/test/render'
import { ApiError } from '../clients/apiError'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('shows message for a plain Error', () => {
    const { getByText, queryByText } = render(<ErrorState error={new Error('boom')} />)
    expect(getByText('boom')).toBeInTheDocument()
    expect(queryByText(/permissions/i)).toBeNull()
  })

  it('shows permissions hint for ApiError with isAuth', () => {
    const { getByText } = render(<ErrorState error={new ApiError(403, 'denied')} />)
    expect(getByText('denied')).toBeInTheDocument()
    expect(getByText(/Insufficient permissions/i)).toBeInTheDocument()
  })

  it('shows permissions hint for 401 ApiError', () => {
    const { getByText } = render(<ErrorState error={new ApiError(401, 'unauthorized')} />)
    expect(getByText(/Insufficient permissions/i)).toBeInTheDocument()
  })

  it('links an auth failure to troubleshooting in the help', () => {
    const { getByRole } = render(<ErrorState error={new ApiError(401, 'unauthorized')} />)
    expect(getByRole('link', { name: 'Troubleshooting' })).toHaveAttribute('href', '/help/getting-started/troubleshooting')
  })

  it('sends no one to the access help for a failure access cannot fix', () => {
    const { queryByRole } = render(<ErrorState error={new ApiError(500, 'Server exploded')} />)
    expect(queryByRole('link', { name: 'Troubleshooting' })).toBeNull()
  })

  it('names a refused link in its own words and links it to troubleshooting', () => {
    const { getByText, getByRole, queryByText } = render(
      <ErrorState error={new ApiError(502, 'Refused a link outside the configured origin.', 'LinkNotAllowed')} />,
    )
    expect(getByText('The data service sent a link to another address')).toBeInTheDocument()
    expect(getByText(/your sign-in was not sent there/)).toBeInTheDocument()
    expect(queryByText('Refused a link outside the configured origin.')).toBeNull()
    expect(getByRole('link', { name: 'Troubleshooting' })).toHaveAttribute('href', '/help/getting-started/troubleshooting')
  })

  it('shows fallback for unknown error type', () => {
    const { getByText } = render(<ErrorState error="something went wrong" />)
    expect(getByText(/unexpected error/i)).toBeInTheDocument()
  })
})
