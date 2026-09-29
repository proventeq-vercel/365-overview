import {
  BrowserAuthError,
  InteractionRequiredAuthError,
  type AccountInfo,
  type IPublicClientApplication,
} from '@azure/msal-browser'
import { ApiError, PROXY_CONSENT_CODE } from '../clients/apiError'

function grants(scopes: readonly string[] | undefined, required: string): boolean {
  const wanted = required.toLowerCase()
  return (scopes ?? []).some((scope) => scope.split('/').pop()?.toLowerCase() === wanted)
}

export async function acquireToken(
  instance: IPublicClientApplication,
  account: AccountInfo,
  scopes: string[],
  requiredScope?: string,
): Promise<string> {
  const request = { account, scopes }
  try {
    let res = await instance.acquireTokenSilent(request)
    if (requiredScope && !grants(res.scopes, requiredScope)) {
      res = await instance.acquireTokenSilent({ ...request, forceRefresh: true })
      if (!grants(res.scopes, requiredScope)) {
        throw new ApiError(
          403,
          `An administrator of this tenant has not granted ${requiredScope} to the app yet.`,
          PROXY_CONSENT_CODE,
        )
      }
    }
    return res.accessToken
  } catch (error) {
    if (
      error instanceof InteractionRequiredAuthError ||
      error instanceof BrowserAuthError
    ) {
      await instance.acquireTokenRedirect(request)
      throw error
    }
    throw error
  }
}
