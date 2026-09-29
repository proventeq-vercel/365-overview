import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { ApiError } from '@/clients/apiError'
import { AccessFailure } from './AccessFailure'

const state = vi.hoisted(() => ({ proxy: undefined as string | undefined }))

vi.mock('@/config/appConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/appConfig')>()
  return {
    ...actual,
    getConfig: () => actual.parseConfig({ VITE_GRAPH_PROXY_URL: state.proxy }, 'https://example.test'),
  }
})

afterEach(cleanup)

const consentError = new ApiError(403, 'not granted', 'AdminConsentRequired')

describe('AccessFailure consent wording per deployment', () => {
  it('explains delegated consent without blaming application permissions', () => {
    state.proxy = undefined
    render(<AccessFailure error={consentError} />)
    expect(screen.getByRole('alert')).toHaveTextContent('reads usage reports as you')
    expect(screen.getByRole('alert')).not.toHaveTextContent('application permissions')
  })

  it('explains application consent when the site reads through the proxy', () => {
    state.proxy = 'https://func-lh-sa-dev.azurewebsites.net/api/graph'
    render(<AccessFailure error={consentError} />)
    expect(screen.getByRole('alert')).toHaveTextContent('application permissions')
    expect(screen.getByRole('alert')).not.toHaveTextContent('reads usage reports as you')
  })
})
