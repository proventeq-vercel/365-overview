import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import { NameCaveats } from './NameCaveats'

const caveats = { entitlementIsEstimated: false, historyTooShort: false, nameMask: null }

describe('NameCaveats', () => {
  it('says names are hidden when this session hides them', () => {
    render(<NameCaveats caveats={{ ...caveats, nameMask: 'hidden' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Site names and owners are hidden')
  })

  it('says the tenant conceals names when Graph hashed them', () => {
    render(<NameCaveats caveats={{ ...caveats, nameMask: 'concealed' }} />)
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Your tenant conceals user and site names')
    expect(screen.getByRole('status')).not.toHaveTextContent('Site names and owners are hidden')
  })

  it('says nothing when names are shown as Graph sent them', () => {
    render(<NameCaveats caveats={caveats} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
