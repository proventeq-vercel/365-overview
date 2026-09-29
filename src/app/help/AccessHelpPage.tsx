import { ACCESS_MODES, type AccessMode } from '@/config/accessMode'
import { Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { useTranslation, type TranslateKey } from '@/hooks/useTranslation'
import { ShellLayout } from '../AppShell'
import { HeaderFrame } from '../Header'
import { AccessModePanel } from './AccessModePanel'

const SYMPTOMS: readonly { label: TranslateKey; help: TranslateKey }[] = [
  { label: 'access.consent.title', help: 'help.fix.consent' },
  { label: 'access.tenant.title', help: 'help.fix.tenant' },
  { label: 'access.permission.title', help: 'help.fix.permission' },
  { label: 'auth.signInFailed', help: 'help.fix.signIn' },
  { label: 'help.symptom.names', help: 'help.fix.names' },
]

function OpenReportLink() {
  const t = useTranslation()
  return (
    <a className="text-sm font-semibold text-p365-teal underline" href="/">
      {t('help.openReport')}
    </a>
  )
}

export function AccessHelpPage({ mode, consentUrl }: { mode: AccessMode; consentUrl: string | null }) {
  const t = useTranslation()
  return (
    <ShellLayout
      header={
        <HeaderFrame
          tenant={<span className="truncate text-sm font-semibold text-p365-navy">{t('help.header')}</span>}
          actions={<OpenReportLink />}
        />
      }
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-p365-navy">{t('help.title')}</h1>
          <p className="max-w-3xl text-sm text-p365-grey-600">{t('help.intro')}</p>
        </div>
        <Section title={t('help.modes.title')} subtitle={t('help.modes.subtitle')}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {ACCESS_MODES.map((each) => (
              <AccessModePanel key={each} mode={each} current={each === mode} consentUrl={consentUrl} />
            ))}
          </div>
        </Section>
        <Section title={t('help.symptoms.title')} subtitle={t('help.symptoms.subtitle')} delay={80}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {SYMPTOMS.map(({ label, help }) => (
              <Panel key={label}>
                <PanelLabel>{t(label)}</PanelLabel>
                <PanelDescription>{t(help)}</PanelDescription>
              </Panel>
            ))}
          </div>
        </Section>
      </div>
    </ShellLayout>
  )
}
