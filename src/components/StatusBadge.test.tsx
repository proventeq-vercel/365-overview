import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the default status label when none is given', () => {
    render(<StatusBadge status="attention" />)
    expect(screen.getByText('Attention')).toBeInTheDocument()
  })
  it('renders a custom label', () => {
    render(<StatusBadge status="watch" label="94% consumed" />)
    expect(screen.getByText('94% consumed')).toBeInTheDocument()
  })
})
