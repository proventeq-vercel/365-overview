import type { ReactNode } from 'react'
import { ApiError } from '../clients/apiError'
import { AlertPanel } from '../design/AlertPanel'
import { useTranslation, type TranslateFn } from '../hooks/useTranslation'

interface ErrorStateProps {
  error: unknown
  action?: ReactNode
}

function describe(error: unknown, t: TranslateFn): { title: string; detail?: string } {
  if (error instanceof ApiError) {
    return {
      title: error.message,
      detail: error.isAuth
        ? t('errors.insufficientPermissions')
        : undefined,
    }
  }
  if (error instanceof Error) return { title: error.message }
  return { title: t('errors.unexpected') }
}

export function ErrorState({ error, action }: ErrorStateProps) {
  const t = useTranslation()
  const { title, detail } = describe(error, t)
  return (
    <AlertPanel tone="error" title={title} action={action}>
      {detail && <p className="text-sm text-p365-grey-600">{detail}</p>}
    </AlertPanel>
  )
}
