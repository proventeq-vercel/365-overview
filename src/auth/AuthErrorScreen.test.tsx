import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { describe, expect, it } from 'vitest'
import { AuthErrorScreen } from './AuthErrorScreen'

describe('AuthErrorScreen', () => {
  it('treats an unconsented organisation as a consent problem, not a failure', () => {
    render(
      <AuthErrorScreen
        error={Object.assign(new Error('AADSTS65001: not consented'), {
          name: 'InteractionRequiredAuthError',
        })}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('has not approved this app yet')
    expect(screen.getByRole('alert')).toHaveTextContent('Global Administrator')
    expect(screen.queryByText('Sign-in failed')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Permissions the report needs' })).toHaveTextContent(
      'Reports.Read.All — Microsoft 365 usage reports',
    )
  })

  it('lists no permissions on a plain sign-in failure', () => {
    render(<AuthErrorScreen error={new Error('network unreachable')} />)
    expect(screen.queryByRole('list', { name: 'Permissions the report needs' })).not.toBeInTheDocument()
  })

  it('shows a plain sign-in failure for anything else', () => {
    render(<AuthErrorScreen error={new Error('network unreachable')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed')
    expect(screen.getByRole('alert')).toHaveTextContent('network unreachable')
  })

  it.each([
    ['consent', Object.assign(new Error('AADSTS65001: not consented'), { name: 'InteractionRequiredAuthError' })],
    ['sign-in', new Error('network unreachable')],
  ])('links the %s failure to the access help page', (_kind, error) => {
    render(<AuthErrorScreen error={error} />)
    expect(screen.getByRole('link', { name: 'How to enable access' })).toHaveAttribute('href', '/help')
  })

  it('survives a thrown non-Error', () => {
    render(<AuthErrorScreen error={'something odd'} />)
    expect(screen.getByRole('alert')).toHaveTextContent('something odd')
  })
})
