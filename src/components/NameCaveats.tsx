import { useTranslation } from '@/hooks/useTranslation'
import type { StorageOverview } from '@/types/storage'
import { CaveatBanner } from './CaveatBanner'

export function NameCaveats({ caveats }: { caveats: StorageOverview['caveats'] }) {
  const t = useTranslation()
  if (caveats.nameMask === null) return null
  return (
    <CaveatBanner tone="info">
      {caveats.nameMask === 'concealed'
        ? t('storageOptimisation.concealedNamesNote')
        : t('storageOptimisation.hiddenNamesNote')}
    </CaveatBanner>
  )
}
