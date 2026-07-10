import {
  BrowserAuthError,
  InteractionRequiredAuthError,
  type AccountInfo,
  type IPublicClientApplication,
} from '@azure/msal-browser'

/**
 * Acquire an access token for the given account and scopes.
 *
 * Tries the silent flow first. If that fails with an error that can only be
 * recovered by user interaction — `InteractionRequiredAuthError` (session
 * expired) or `BrowserAuthError` (iframe bridge timeout, often third-party
 * cookie blocking) — it triggers an interactive `acquireTokenRedirect`. That
 * call navigates the browser away, so the returned promise does not resolve to
 * a token in practice. Any other error is rethrown.
 *
 * Mirrors the ProventeqCloud MSAL token-acquisition pattern (redirect, not
 * popup).
 */
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
    if (
      error instanceof InteractionRequiredAuthError ||
      error instanceof BrowserAuthError
    ) {
      await instance.acquireTokenRedirect(request)
      // The browser redirects; this line is unreachable in practice.
      throw error
    }
    throw error
  }
}
