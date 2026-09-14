import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { BootstrapError } from './BootstrapError'

afterEach(cleanup)

describe('BootstrapError', () => {
  it('names the failure and shows the underlying message', () => {
    render(<BootstrapError message="VITE_CLIENT_ID is not set" overridden={false} />)
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't start the dashboard")
    expect(screen.getByText('VITE_CLIENT_ID is not set')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers the per-tab reset when a URL override may have caused it', () => {
    render(<BootstrapError message="VITE_CLIENT_ID is not set" overridden />)
    expect(screen.getByText(/this tab overrides the deployed modes/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reset the modes for this tab' })).toHaveAttribute(
      'href',
      '?modes=reset',
    )
  })
})
