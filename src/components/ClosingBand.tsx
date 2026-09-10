export function ClosingBand({ callCount }: { callCount: number }) {
  return (
    <section className="rounded-xl border border-hairline bg-surface px-6 py-5" aria-label="What this report cannot see">
      <p className="text-sm text-ink">
        This report is {callCount} read-only calls to Microsoft Graph, made in your browser with your own sign-in.
        It sees sharing <strong>links</strong> and tenant settings. It cannot see who holds Edit or Full Control on
        a file, which folders broke permission inheritance, which items carry unique, direct or redundant
        permissions, or which AI agents have been added to a site — and it cannot fix any of it.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Full Proventeq 365 discovery reveals what sits underneath these numbers, and lets you act on it.
      </p>
    </section>
  )
}
