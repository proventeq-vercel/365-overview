/** Minimal centered loading screen used while MSAL initializes / authenticates. */
export function AuthLoadingScreen({ title }: { title: string }) {
  return (
    <div className="auth-screen">
      <div className="auth-screen__card">
        <div className="auth-screen__spinner" aria-hidden="true" />
        <p className="auth-screen__title">{title}</p>
      </div>
    </div>
  )
}
