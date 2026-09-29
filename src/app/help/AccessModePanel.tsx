import { Panel, PanelDescription, PanelLabel, Pill } from '@/design/primitives'
import { LABEL_TONES } from '@/design/theme'
import type { AccessMode } from '@/config/accessMode'
import { useTranslation, type TranslateKey } from '@/hooks/useTranslation'

interface ModePermission {
  name: string
  label: TranslateKey
  required: boolean
}

const PERMISSIONS: readonly ModePermission[] = [
  { name: 'Reports.Read.All', label: 'access.permissions.reports', required: true },
  { name: 'Organization.Read.All', label: 'access.permissions.organization', required: false },
  { name: 'Sites.Read.All', label: 'help.permission.sites', required: false },
]

const STEPS = [1, 2, 3] as const

export function AccessModePanel({
  mode,
  current,
  consentUrl,
}: {
  mode: AccessMode
  current: boolean
  consentUrl: string | null
}) {
  const t = useTranslation()
  const title = t(`help.mode.${mode}.title`)
  return (
    <Panel className={current ? 'border-p365-teal' : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <PanelLabel>{title}</PanelLabel>
        {current && <Pill tone={LABEL_TONES.green}>{t('help.thisSite')}</Pill>}
      </div>
      <PanelDescription>{t(`help.mode.${mode}.body`)}</PanelDescription>
      <ol
        aria-label={t('help.stepsLabel', { mode: title })}
        className="list-decimal space-y-1 pl-5 text-sm text-p365-grey-700"
      >
        {STEPS.map((step) => (
          <li key={step}>{t(`help.mode.${mode}.step${step}`)}</li>
        ))}
      </ol>
      {current && consentUrl && (
        <p className="text-sm text-p365-grey-600">
          <a className="font-semibold text-p365-teal underline" href={consentUrl}>
            {t('help.consentLink')}
          </a>
        </p>
      )}
      <ul aria-label={t('help.permissionsLabel', { mode: title })} className="mt-1 space-y-1 text-sm text-p365-grey-600">
        {PERMISSIONS.map((permission) => (
          <li key={permission.name} className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-semibold">{permission.name}</code>
              <Pill tone={permission.required ? LABEL_TONES.orange : LABEL_TONES.grey}>
                {permission.required ? t('help.permission.required') : t('help.permission.optional')}
              </Pill>
            </div>
            <span>{t(permission.label)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
