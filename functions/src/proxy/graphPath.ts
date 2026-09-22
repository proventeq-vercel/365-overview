import { ProxyError } from './errors.js'

export function decodePath(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    throw new ProxyError(404, 'RouteNotAllowed', 'The request path is not valid percent-encoding.')
  }
}

export const encodePath = (path: string) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/%3D/g, '='))
    .join('/')
