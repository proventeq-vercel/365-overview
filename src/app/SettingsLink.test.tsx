import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRef, type ReactNode } from 'react'
import { render } from '@/test/render'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource } from '@/data/fixtures'
import { SettingsLink } from './SettingsLink'
import { useSettingsDialog } from './useSettingsDialog'
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
  function Link() {
    const fallback = useRef<HTMLButtonElement>(null)
    const { openSettings, dialog } = useSettingsDialog(fallback)
    return (
      <>
        <button ref={fallback} type="button">
          Elsewhere
        </button>
        <SettingsLink onOpen={openSettings(field)}>Change it</SettingsLink>
        {dialog}
      </>
    )
  }
  render(<Link />, { wrapper: Wrapper })
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

  it('hands focus back to the link when the dialog closes', async () => {
    renderLink('entitlement')
    await userEvent.click(screen.getByRole('button', { name: 'Change it' }))
    await screen.findByRole('dialog', { name: 'Report settings' })
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => document.activeElement).toBe(screen.getByRole('button', { name: 'Change it' }))
  })
})
