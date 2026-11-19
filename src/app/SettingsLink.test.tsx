import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { render } from '@/test/render'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource } from '@/data/fixtures'
import { SettingsLink } from './SettingsLink'
import { SettingsProvider } from './SettingsProvider'
import type { SettingsField } from './SettingsDialog'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderLink(field: SettingsField) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={createMockDataSource('healthy')}>
          <SettingsProvider>{children}</SettingsProvider>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  render(<SettingsLink field={field}>Change it</SettingsLink>, { wrapper: Wrapper })
}

describe('SettingsLink', () => {
  it('opens Report settings on the inactivity period', async () => {
    renderLink('inactiveYears')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change it' }))
    expect(await screen.findByRole('dialog', { name: 'Report settings' })).toBeInTheDocument()
    await expect.poll(() => document.activeElement).toBe(screen.getByLabelText('Archive sites inactive for'))
  })

  it('opens Report settings on the SharePoint entitlement', async () => {
    renderLink('entitlement')
    await userEvent.click(screen.getByRole('button', { name: 'Change it' }))
    await expect.poll(() => document.activeElement).toBe(screen.getByLabelText('SharePoint entitlement'))
  })
})
