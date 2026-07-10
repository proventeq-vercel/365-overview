import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HealthTile } from './HealthTile'

describe('HealthTile', () => {
  it('renders a link with the label and value', () => {
    render(
      <MemoryRouter>
        <HealthTile to="/sharepoint" label="SharePoint" value="4 sites" status="healthy" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /SharePoint/ })
    expect(link).toHaveAttribute('href', '/sharepoint')
    expect(screen.getByText('4 sites')).toBeInTheDocument()
  })
})
