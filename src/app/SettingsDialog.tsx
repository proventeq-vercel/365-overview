import { useId, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdornedInput } from '@/design/AdornedInput'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { useTranslation } from '@/hooks/useTranslation'
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

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslation()
  const { settings, update } = useSettings()
  const { data } = useStorageOverview(settings)
  const currencyId = useId()
  const rateId = useId()
  const entitlementId = useId()

  const licenceEstimateBytes = data?.sharePoint.licenceEstimateBytes ?? null
  const licenceEstimate = licenceEstimateBytes === null ? null : formatBytes(licenceEstimateBytes)
  const overrideTb =
    settings.entitlementOverrideBytes === null
      ? ''
      : String(settings.entitlementOverrideBytes / TB_IN_BYTES)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t('settings.title')}</DialogTitle>
        <DialogDescription>{t('settings.description')}</DialogDescription>
        <div className="mt-4 flex flex-col gap-4">
          <Field id={currencyId} label={t('settings.currency')}>
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
            label={t('settings.rate')}
            hint={t('settings.rateHint')}
          >
            <AdornedInput
              id={rateId}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              prefix={currencySymbol(settings.currency)}
              suffix={t('settings.rateSuffix')}
              value={settings.ratePerGb}
              onChange={(e) => update({ ratePerGb: Number(e.target.value) })}
            />
          </Field>

          <Field
            id={entitlementId}
            label={t('settings.entitlement')}
            hint={
              licenceEstimate
                ? t('settings.entitlementHint', { estimate: licenceEstimate })
                : t('settings.entitlementHintNoEstimate')
            }
          >
            <AdornedInput
              id={entitlementId}
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              suffix={t('settings.entitlementUnit')}
              placeholder={t('settings.entitlementPlaceholder')}
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
      </DialogContent>
    </Dialog>
  )
}
