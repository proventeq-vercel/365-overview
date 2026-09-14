import type { ReactNode } from 'react'
import { IntlProvider, ReactIntlErrorCode } from 'react-intl'
import messages from '@/intl/en.json'

export const DEFAULT_LOCALE = 'en-GB'

export function AppIntlProvider({ children }: { children: ReactNode }) {
  return (
    <IntlProvider
      locale={DEFAULT_LOCALE}
      messages={messages}
      onError={(error) => {
        if (error.code !== ReactIntlErrorCode.MISSING_TRANSLATION) console.error(error)
      }}
    >
      {children}
    </IntlProvider>
  )
}
