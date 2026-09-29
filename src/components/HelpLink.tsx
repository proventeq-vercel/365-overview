import { useTranslation } from '@/hooks/useTranslation'
import { HELP_PATH } from '@/config/helpPath'

export function HelpLink() {
  const t = useTranslation()
  return (
    <p className="text-sm text-p365-grey-600">
      <a className="font-semibold text-p365-teal underline" href={HELP_PATH}>
        {t('help.link')}
      </a>
    </p>
  )
}
