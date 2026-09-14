import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FacetBars } from './charts'

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

  it('shows the empty text instead of an empty list', () => {
    render(<FacetBars items={[]} formatValue={String} emptyText="No results" />)
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
