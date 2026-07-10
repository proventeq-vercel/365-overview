import { ApiError } from '../clients/apiError'

interface ErrorStateProps {
  error: unknown
}

export function ErrorState({ error }: ErrorStateProps) {
  if (error instanceof ApiError) {
    return (
      <div className="rounded-xl border border-hairline border-l-4 border-l-coral bg-surface px-5 py-4" role="alert">
        <p className="font-semibold text-ink">{error.message}</p>
        {error.isAuth && (
          <p className="mt-1 text-sm text-muted-foreground">
            Insufficient permissions — admin consent or the required role may be needed for this report.
          </p>
        )}
      </div>
    )
  }

  if (error instanceof Error) {
    return (
      <div className="rounded-xl border border-hairline border-l-4 border-l-coral bg-surface px-5 py-4" role="alert">
        <p className="font-semibold text-ink">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-hairline border-l-4 border-l-coral bg-surface px-5 py-4" role="alert">
      <p className="font-semibold text-ink">An unexpected error occurred.</p>
    </div>
  )
}
