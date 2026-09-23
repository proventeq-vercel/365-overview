import type { ComponentType, ReactNode } from 'react'
import { render as renderBare, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createIntl } from 'react-intl'
import { AppIntlProvider, DEFAULT_LOCALE } from '@/app/AppIntlProvider'
import { DataSourceContext } from '@/data/useDataSource'
import type { DataSource } from '@/data/dataSource'
import messages from '@/intl/en.json'
import type { TranslateFn } from '@/hooks/useTranslation'

const intl = createIntl({ locale: DEFAULT_LOCALE, messages })

export const translate: TranslateFn = (id, values) =>
  intl.formatMessage({ id, defaultMessage: id }, values)

export function render(ui: ReactNode, { wrapper: Inner, ...options }: RenderOptions = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    const Body = Inner as ComponentType<{ children: ReactNode }> | undefined
    return <AppIntlProvider>{Body ? <Body>{children}</Body> : children}</AppIntlProvider>
  }
  return renderBare(ui, { ...options, wrapper: Wrapper })
}

export const NO_SITE_DETAILS: DataSource['getSiteDetails'] = async () => new Map()

export function renderWithData(ui: ReactNode, source: Partial<DataSource> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ds = { getSiteDetails: NO_SITE_DETAILS, ...source } as DataSource
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={ds}>{children}</DataSourceContext>
      </QueryClientProvider>
    )
  }
  return render(ui, { wrapper: Wrapper })
}
