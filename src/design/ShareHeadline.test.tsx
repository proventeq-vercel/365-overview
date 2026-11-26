import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { ShareHeadline } from './ShareHeadline'

afterEach(cleanup)

describe('ShareHeadline', () => {
  it('writes the percentage in the text shade of its colour', () => {
    render(<ShareHeadline share="96%" color="#edba20">of the entitlement is used</ShareHeadline>)
    expect(screen.getByText('96%').style.color).toBe('rgb(131, 101, 11)')
  })
})
