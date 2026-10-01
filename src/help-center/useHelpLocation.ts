import { useCallback, useEffect, useState } from 'react'
import { decodePart, slugOfPath } from './links'

export const AUDIENCE_PARAM = 'audience'

export interface HelpLocation {
  slug: string | null
  hash: string
  audience: string | null
}

function readLocation(basePath: string): HelpLocation {
  const { pathname, search, hash } = window.location
  return {
    slug: slugOfPath(basePath, pathname),
    hash: decodePart(hash.replace(/^#/, '')),
    audience: new URLSearchParams(search).get(AUDIENCE_PARAM),
  }
}

function scrollToHash(hash: string) {
  const target = hash ? document.getElementById(hash) : null
  if (target) target.scrollIntoView()
  else window.scrollTo({ top: 0 })
}

export function useHelpLocation(basePath: string) {
  const [location, setLocation] = useState(() => readLocation(basePath))

  useEffect(() => {
    const onPop = () => setLocation(readLocation(basePath))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [basePath])

  useEffect(() => {
    scrollToHash(location.hash)
  }, [location])

  const navigate = useCallback(
    (href: string) => {
      window.history.pushState(null, '', href)
      setLocation(readLocation(basePath))
    },
    [basePath],
  )

  return { location, navigate }
}
