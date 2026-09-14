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

  it('shows fallback for unknown error type', () => {
    const { getByText } = render(<ErrorState error="something went wrong" />)
    expect(getByText(/unexpected error/i)).toBeInTheDocument()
  })
})
