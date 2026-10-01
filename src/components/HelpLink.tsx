import { useTranslation } from '@/hooks/useTranslation'
import { helpUrl } from '@/config/helpPath'
import { HELP_TOPICS } from '@/app/help/topics'

export function HelpLink() {
  const t = useTranslation()
  return (
    <p className="text-sm text-p365-grey-600">
      <a className="font-semibold text-p365-teal underline" href={helpUrl(HELP_TOPICS.troubleshooting)}>
        {t('help.link')}
      </a>
    </p>
  )
}
