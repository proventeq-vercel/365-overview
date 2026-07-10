import { ApiError } from '../clients/apiError'

interface ErrorStateProps {
  error: unknown
}

export function ErrorState({ error }: ErrorStateProps) {
  if (error instanceof ApiError) {
    return (
      <div className="error-state" role="alert">
        <p className="error-state__message">{error.message}</p>
        {error.isAuth && (
          <p className="error-state__hint">
            Insufficient permissions — admin consent or the required role may be needed for this report.
          </p>
        )}
      </div>
    )
  }

  if (error instanceof Error) {
    return (
      <div className="error-state" role="alert">
        <p className="error-state__message">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="error-state" role="alert">
      <p className="error-state__message">An unexpected error occurred.</p>
    </div>
  )
}
