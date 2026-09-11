import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GB_IN_BYTES } from '@/lib/entitlement'
import type { ReportSettings } from '@/lib/settings'
import type { StorageOverview } from '@/types/storage'
import { COPY } from './copy'

const TB_IN_BYTES = 1024 * GB_IN_BYTES

interface Props {
  overview: StorageOverview
  tenantName: string
  settings: ReportSettings
  onSettingsChange: (settings: ReportSettings) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ReportHeader({
  overview,
  tenantName,
  settings,
  onSettingsChange,
  open: openProp,
  onOpenChange,
}: Props) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = onOpenChange ?? setOpenState
  const rateId = useId()
  const currencyId = useId()
  const entitlementId = useId()

  const overrideTb =
    settings.entitlementOverrideBytes === null
      ? ''
      : String(settings.entitlementOverrideBytes / TB_IN_BYTES)

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ink">{tenantName}</h1>
          <p className="text-sm text-muted-foreground">
            Data as of {overview.reportRefreshDate}. {COPY.reportLagNote}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          Settings
        </Button>
      </div>

      {open && (
        <div className="grid gap-4 rounded-lg border border-hairline bg-surface p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm" htmlFor={rateId}>
            <span className="font-medium text-ink">Rate per GB per month</span>
            <input
              id={rateId}
              type="number"
              step="0.01"
              min="0"
              value={settings.ratePerGb}
              onChange={(e) =>
                onSettingsChange({ ...settings, ratePerGb: Number(e.target.value) })
              }
              className="rounded-md border border-hairline bg-transparent px-3 py-2 text-ink outline-none focus:border-ink-soft"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm" htmlFor={currencyId}>
            <span className="font-medium text-ink">Currency</span>
            <input
              id={currencyId}
              type="text"
              value={settings.currency}
              onChange={(e) =>
                onSettingsChange({ ...settings, currency: e.target.value.toUpperCase() })
              }
              className="rounded-md border border-hairline bg-transparent px-3 py-2 text-ink outline-none focus:border-ink-soft"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm" htmlFor={entitlementId}>
            <span className="font-medium text-ink">Entitlement (TB)</span>
            <input
              id={entitlementId}
              type="number"
              step="0.5"
              min="0"
              value={overrideTb}
              placeholder="Estimated from licences"
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  entitlementOverrideBytes:
                    e.target.value === '' ? null : Number(e.target.value) * TB_IN_BYTES,
                })
              }
              className="rounded-md border border-hairline bg-transparent px-3 py-2 text-ink outline-none focus:border-ink-soft"
            />
            <span className="text-xs text-muted-foreground">
              From the SharePoint admin centre. Clears every estimated-entitlement caveat.
            </span>
          </label>
        </div>
      )}
    </header>
  )
}
