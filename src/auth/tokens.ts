import {
  BrowserAuthError,
  BrowserAuthErrorCodes,
  InteractionRequiredAuthError,
  type AccountInfo,
  type IPublicClientApplication,
} from '@azure/msal-browser'

const NOT_FIXED_BY_SIGNING_IN = new Set<string>([
  BrowserAuthErrorCodes.noNetworkConnectivity,
  BrowserAuthErrorCodes.postRequestFailed,
  BrowserAuthErrorCodes.getRequestFailed,
  BrowserAuthErrorCodes.interactionInProgress,
])

const needsInteraction = (error: unknown) =>
  error instanceof InteractionRequiredAuthError ||
  (error instanceof BrowserAuthError && !NOT_FIXED_BY_SIGNING_IN.has(error.errorCode))

export async function acquireToken(
  instance: IPublicClientApplication,
  account: AccountInfo,
  scopes: string[],
): Promise<string> {
  const request = { account, scopes }
  try {
    const res = await instance.acquireTokenSilent(request)
    return res.accessToken
  } catch (error) {
    if (needsInteraction(error)) await instance.acquireTokenRedirect(request)
    throw error
  }
}
