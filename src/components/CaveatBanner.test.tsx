import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import { CaveatBanner } from './CaveatBanner'

afterEach(cleanup)

describe('CaveatBanner', () => {
  it('renders its message in a status region so it is announced', () => {
    render(<CaveatBanner tone="warning">Entitlement is estimated</CaveatBanner>)
    expect(screen.getByRole('status')).toHaveTextContent('Entitlement is estimated')
  })

  it('renders an action alongside the message when one is given', () => {
    render(
      <CaveatBanner tone="info" action={<button type="button">Open settings</button>}>
        Names are concealed
      </CaveatBanner>,
    )
    expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument()
  })
})
