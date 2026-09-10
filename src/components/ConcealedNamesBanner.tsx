export function ConcealedNamesBanner() {
  return (
    <div className="rounded-lg border border-hairline border-l-4 border-l-[#2e9cc7] bg-surface px-4 py-3" role="note">
      <p className="text-sm font-semibold text-ink">Names in this tenant are concealed</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Your tenant has <strong>Display concealed user, group, and site names</strong> switched on, so site URLs,
        owners and user names arrive from Microsoft 365 as hashed identifiers. Every total and percentage on this
        page is unaffected. To see real names, a Global Administrator can turn it off in the Microsoft 365 admin
        centre under Settings → Org settings → Reports.
      </p>
    </div>
  )
}
