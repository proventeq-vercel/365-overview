import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { StatCard } from './StatCard'

afterEach(cleanup)

describe('StatCard', () => {
  it('keeps the brand colour on the rail and writes the value in its text shade', () => {
    render(<StatCard label="Cost of doing nothing" value="£120" color="#f97f50" />)
    const card = screen.getByText('Cost of doing nothing').closest('[data-slot="stat-card"]') as HTMLElement
    expect(card.style.borderLeftColor).toBe('rgb(249, 127, 80)')
    expect(screen.getByText('£120').style.color).toBe('rgb(192, 58, 7)')
  })
})
