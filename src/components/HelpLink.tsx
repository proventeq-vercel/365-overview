import { useTranslation } from '@/hooks/useTranslation'
import { helpUrl } from '@/config/helpPath'

export const TROUBLESHOOTING_SLUG = 'getting-started/troubleshooting'

export function HelpLink() {
  const t = useTranslation()
  return (
    <p className="text-sm text-p365-grey-600">
      <a className="font-semibold text-p365-teal underline" href={helpUrl(TROUBLESHOOTING_SLUG)}>
        {t('help.link')}
      </a>
    </p>
  )
}
