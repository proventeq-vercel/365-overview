import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import { NameCaveats } from './NameCaveats'

const caveats = { entitlementIsEstimated: false, historyTooShort: false, namesAreConcealed: false, namesHidden: false }

describe('NameCaveats', () => {
  it('says names are hidden when this session hides them', () => {
    render(<NameCaveats caveats={{ ...caveats, namesHidden: true }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Site names and owners are hidden')
  })

  it('says the tenant conceals names when Graph hashed them', () => {
    render(<NameCaveats caveats={{ ...caveats, namesAreConcealed: true }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Your tenant conceals user and site names')
  })

  it('says nothing when names are shown as Graph sent them', () => {
    render(<NameCaveats caveats={caveats} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
