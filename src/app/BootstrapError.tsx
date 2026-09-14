import { AlertPanel } from '@/design/AlertPanel'
import { useTranslation } from '@/hooks/useTranslation'
import { ModesOverrideHint } from './ModesOverrideHint'

interface BootstrapErrorProps {
  message: string
  overridden: boolean
}

export function BootstrapError({ message, overridden }: BootstrapErrorProps) {
  const t = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-p365-page p-8">
      <div className="w-full max-w-md">
        <AlertPanel tone="error" title={t('app.bootstrap.title')}>
          <p className="text-sm text-p365-grey-600">{t('app.bootstrap.body')}</p>
          {overridden && <ModesOverrideHint />}
          <p className="text-sm break-words text-p365-grey-500">{message}</p>
        </AlertPanel>
      </div>
    </div>
  )
}
