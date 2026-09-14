import type { ComponentType, ReactNode } from 'react'
import { render as renderBare, type RenderOptions } from '@testing-library/react'
import { createIntl } from 'react-intl'
import { AppIntlProvider, DEFAULT_LOCALE } from '@/app/AppIntlProvider'
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
