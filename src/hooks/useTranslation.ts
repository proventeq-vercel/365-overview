import { useCallback } from 'react'
import { useIntl, type PrimitiveType } from 'react-intl'
import messages from '@/intl/en.json'

export type TranslateKey = keyof typeof messages
export type TranslateValues = Record<string, PrimitiveType> | undefined
export type TranslateFn = (id: TranslateKey, values?: TranslateValues) => string

export function useTranslation(): TranslateFn {
  const intl = useIntl()
  return useCallback(
    (id: TranslateKey, values?: TranslateValues) =>
      intl.formatMessage({ id, defaultMessage: id }, values),
    [intl],
  )
}
