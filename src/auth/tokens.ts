import {
  InteractionRequiredAuthError,
  type AccountInfo,
  type IPublicClientApplication,
} from '@azure/msal-browser'

export async function acquireToken(
  instance: IPublicClientApplication,
  account: AccountInfo,
  scopes: string[],
): Promise<string> {
  try {
    const res = await instance.acquireTokenSilent({ account, scopes })
    return res.accessToken
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const res = await instance.acquireTokenPopup({ scopes })
      return res.accessToken
    }
    throw e
  }
}
