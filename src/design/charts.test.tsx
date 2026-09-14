import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { FacetBars } from './charts'
import { Legend } from './primitives'

afterEach(cleanup)

const GB = 1_073_741_824

describe('FacetBars', () => {
  it('draws each bar relative to the largest item and prints the formatted value', () => {
    render(
      <FacetBars
        items={[
          { name: 'engineering', value: 200 * GB },
          { name: 'team-1', value: 50 * GB },
        ]}
        formatValue={(v) => `${v / GB} GB`}
        emptyText="No results"
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    const fills = rows.map((row) => (row.querySelector('[aria-hidden]') as HTMLElement).style.width)
    expect(fills).toEqual(['100%', '25%'])
    expect(rows[0]).toHaveTextContent('engineering')
    expect(rows[0]).toHaveTextContent('200 GB')
  })

  it('renders two sites that share a display name as two distinct rows, without a key clash', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <FacetBars
        items={[
          { name: 'Bill Gates', value: 200 },
          { name: 'Bill Gates', value: 100 },
        ]}
        formatValue={String}
        emptyText="No results"
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('shows the empty text instead of an empty list', () => {
    render(<FacetBars items={[]} formatValue={String} emptyText="No results" />)
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})

describe('Legend', () => {
  it('lists two slices that share a name without a key clash', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Legend
        items={[
          { name: 'Bill Gates', color: '#000' },
          { name: 'Bill Gates', color: '#111' },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
