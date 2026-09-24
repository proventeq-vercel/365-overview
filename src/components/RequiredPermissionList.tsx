import { REQUIRED_PERMISSIONS } from '@/config/requiredPermissions'
import { useTranslation } from '@/hooks/useTranslation'

export function RequiredPermissionList() {
  const t = useTranslation()
  return (
    <div className="text-sm text-p365-grey-600">
      <p>{t('access.permissions.intro')}</p>
      <ul aria-label={t('access.permissions.listLabel')} className="mt-1 list-disc space-y-0.5 pl-5 text-left">
        {REQUIRED_PERMISSIONS.map((permission) => (
          <li key={permission.name}>
            <code className="font-semibold">{permission.name}</code> — {t(permission.label)}
          </li>
        ))}
      </ul>
    </div>
  )
}
