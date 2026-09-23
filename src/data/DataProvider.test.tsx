import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DataProvider } from './DataProvider'
import type { DataSource } from './fixtures'
import { useDataSource } from './useDataSource'

vi.mock('../config/env', () => ({ env: { useMock: true, mockScenario: 'healthy', localAuthUrl: null } }))

describe('DataProvider in mock mode', () => {
  it('keeps the same fixture source across renders instead of rebuilding thousands of rows', () => {
    const seen: DataSource[] = []
    function Probe() {
      seen.push(useDataSource())
      return null
    }
    const view = render(
      <DataProvider>
        <Probe />
      </DataProvider>,
    )
    view.rerender(
      <DataProvider>
        <Probe />
      </DataProvider>,
    )
    expect(seen).toHaveLength(2)
    expect(seen[1]).toBe(seen[0])
  })
})
