import { useId, type ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdornedInput } from '@/design/AdornedInput'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { currencyName, currencyOptions, currencySymbol } from '@/lib/currencies'
import { GB_IN_BYTES } from '@/lib/entitlement'
import { formatBytes } from '@/lib/format'
import { useSettings } from './useSettings'

const TB_IN_BYTES = 1024 * GB_IN_BYTES

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-p365-grey-600">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-p365-grey-500">{hint}</p>}
    </div>
  )
}

export function SettingsPopover() {
  const { settings, update } = useSettings()
  const { data } = useStorageOverview(settings)
  const currencyId = useId()
  const rateId = useId()
  const entitlementId = useId()

  const licenceEstimate = data ? formatBytes(data.sharePoint.licenceEstimateBytes) : null
  const overrideTb =
    settings.entitlementOverrideBytes === null
      ? ''
      : String(settings.entitlementOverrideBytes / TB_IN_BYTES)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Settings"
            title="Report settings"
          />
        }
      >
        <Settings aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))]" aria-label="Report settings">
        <PopoverTitle>Report settings</PopoverTitle>
        <PopoverDescription>
          Cost assumptions and the tenant entitlement. Saved in this browser only.
        </PopoverDescription>
        <div className="mt-4 flex flex-col gap-4">
          <Field id={currencyId} label="Currency">
            <Select
              value={settings.currency}
              onValueChange={(value) => update({ currency: value ?? settings.currency })}
            >
              <SelectTrigger id={currencyId} className="h-9 w-full bg-white">
                <SelectValue>
                  {(value: string) => (
                    <span className="flex items-center gap-2">
                      <span className="w-8 shrink-0 text-center text-p365-grey-500">
                        {currencySymbol(value)}
                      </span>
                      <span className="font-semibold">{value}</span>
                      <span className="truncate text-p365-grey-500">{currencyName(value)}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {currencyOptions(settings.currency).map((code) => (
                  <SelectItem key={code} value={code}>
                    <span className="w-8 shrink-0 text-center text-p365-grey-500">
                      {currencySymbol(code)}
                    </span>
                    <span className="font-semibold">{code}</span>
                    <span className="text-p365-grey-500">{currencyName(code)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            id={rateId}
            label="Cost per GB per month"
            hint="Used for the cost of doing nothing and the growth cost."
          >
            <AdornedInput
              id={rateId}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              prefix={currencySymbol(settings.currency)}
              suffix="/ GB / month"
              value={settings.ratePerGb}
              onChange={(e) => update({ ratePerGb: Number(e.target.value) })}
            />
          </Field>

          <Field
            id={entitlementId}
            label="SharePoint entitlement"
            hint={
              licenceEstimate
                ? `Estimated from licences: ${licenceEstimate}. Enter the figure from the SharePoint admin centre to replace it; clear it to go back to the estimate.`
                : 'Enter the figure from the SharePoint admin centre; clear it to use the licence estimate.'
            }
          >
            <AdornedInput
              id={entitlementId}
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              suffix="TB"
              placeholder="Estimated from licences"
              value={overrideTb}
              onChange={(e) =>
                update({
                  entitlementOverrideBytes:
                    e.target.value === '' ? null : Number(e.target.value) * TB_IN_BYTES,
                })
              }
            />
          </Field>
        </div>
      </PopoverContent>
    </Popover>
  )
}
