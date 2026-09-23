import { CaveatBanner } from '@/components/CaveatBanner'
import type { AppEnv } from '@/config/env'
import { useTranslation } from '@/hooks/useTranslation'
import { ModesResetLink } from './ModesOverrideHint'

export function SampleDataBanner({ env }: { env: Pick<AppEnv, 'useMock' | 'overrides'> }) {
  const t = useTranslation()
  if (!env.useMock) return null
  return (
    <div className="mb-6">
      <CaveatBanner
        tone="warning"
        action={env.overrides.useMock === 'true' ? <ModesResetLink /> : undefined}
      >
        {t('app.sampleData')}
      </CaveatBanner>
    </div>
  )
}
