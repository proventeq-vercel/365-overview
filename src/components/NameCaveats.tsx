import { useTranslation } from '@/hooks/useTranslation'
import type { StorageOverview } from '@/types/storage'
import { CaveatBanner } from './CaveatBanner'

export function NameCaveats({ caveats }: { caveats: StorageOverview['caveats'] }) {
  const t = useTranslation()
  return (
    <>
      {caveats.namesHidden && <CaveatBanner tone="info">{t('storageOptimisation.hiddenNamesNote')}</CaveatBanner>}
      {caveats.namesAreConcealed && (
        <CaveatBanner tone="info">{t('storageOptimisation.concealedNamesNote')}</CaveatBanner>
      )}
    </>
  )
}
