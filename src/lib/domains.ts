export function domainFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  const at = address.lastIndexOf('@')
  if (at < 1 || at === address.length - 1) return null
  const domain = address.slice(at + 1).toLowerCase()
  return domain.includes('.') ? domain : null
}

export function domainFromExternalUpn(upn: string | null | undefined): string | null {
  if (!upn) return null
  const marker = upn.toUpperCase().indexOf('#EXT#')
  if (marker < 1) return null
  const encodedAddress = upn.slice(0, marker)
  const separator = encodedAddress.lastIndexOf('_')
  if (separator < 1) return null
  const domain = encodedAddress.slice(separator + 1).toLowerCase()
  return domain.includes('.') ? domain : null
}

export interface GuestIdentity {
  mail?: string | null
  userPrincipalName?: string | null
}

export function guestDomain(guest: GuestIdentity): string | null {
  return domainFromAddress(guest.mail) ?? domainFromExternalUpn(guest.userPrincipalName)
}

export function isExternalDomain(domain: string, verifiedDomains: string[]): boolean {
  return !verifiedDomains.some((verified) => verified.toLowerCase() === domain.toLowerCase())
}
