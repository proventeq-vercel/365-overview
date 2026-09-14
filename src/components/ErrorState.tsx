import type { ReactNode } from 'react'
import { ApiError } from '../clients/apiError'
import { AlertPanel } from '../design/AlertPanel'

interface ErrorStateProps {
  error: unknown
  action?: ReactNode
}

function describe(error: unknown): { title: string; detail?: string } {
  if (error instanceof ApiError) {
    return {
      title: error.message,
      detail: error.isAuth
        ? 'Insufficient permissions — admin consent or the required role may be needed for this report.'
        : undefined,
    }
  }
  if (error instanceof Error) return { title: error.message }
  return { title: 'An unexpected error occurred.' }
}

export function ErrorState({ error, action }: ErrorStateProps) {
  const { title, detail } = describe(error)
  return (
    <AlertPanel tone="error" title={title} action={action}>
      {detail && <p className="text-sm text-p365-grey-600">{detail}</p>}
    </AlertPanel>
  )
}
