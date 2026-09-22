import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSelfSignedCertificate } from '../local/certificate.js'
import { buildClientAssertion, tokenEndpoint } from '../src/proxy/appToken.js'
import { leafCertificateOf, readCertificateCredential } from '../src/proxy/certificate.js'
import { PUBLIC_AUTHORITY_HOST, PUBLIC_GRAPH_ORIGIN } from '../src/proxy/config.js'
import { ProxyError } from '../src/proxy/errors.js'
import { importPKCS8 } from 'jose'

const args = process.argv.slice(2)
const command = args[0] ?? 'new'

function option(name: string, fallback: string | null = null): string | null {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

function fail(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

function generate(): void {
  const commonName = option('name', '365-overview-graph-proxy') as string
  const days = Number(option('days', '730'))
  const outDir = option('out', '.temp') as string
  if (!Number.isInteger(days) || days < 1) fail(`--days must be a whole number of days; got "${option('days')}".`)

  const certificate = createSelfSignedCertificate({ commonName, days })
  mkdirSync(outDir, { recursive: true })
  const bundlePath = join(outDir, 'graph-proxy.pem')
  const publicPath = join(outDir, 'graph-proxy.crt')
  writeFileSync(bundlePath, `${certificate.privateKeyPem}${certificate.certificatePem}`, { mode: 0o600 })
  writeFileSync(publicPath, certificate.certificatePem)

  console.log(`
  Certificate created — the private key never has to leave this machine.

    private key + certificate  ${bundlePath}          (this is GRAPH_CERT_PEM)
    certificate only           ${publicPath}          (upload this one)

    subject     CN=${commonName}
    thumbprint  ${certificate.thumbprintHex}
    expires     ${certificate.notAfter.toISOString().slice(0, 10)}

  1. Upload the public certificate to the registration that holds the Graph application roles:

       az ad app credential reset --id <client id> --cert @${publicPath} --append

     (or Portal → App registrations → Certificates & secrets → Upload certificate)

  2. Set GRAPH_CERT_PEM to the contents of ${bundlePath}. In Azure keep it in Key Vault and
     reference the secret; GRAPH_CERT_THUMBPRINT is not needed — it is read from the certificate.

  3. Prove Entra accepts it:

       npm run cert:check -- --pem ${bundlePath} --client-id <client id> --tenant <tenant id>
`)
}

async function check(): Promise<void> {
  const pemPath = option('pem')
  if (!pemPath) fail('Pass --pem <file>, the bundle written by `npm run cert:new`.')
  const pem = readFileSync(pemPath, 'utf8')
  if (!pem.trim()) fail(`${pemPath} is empty.`)

  let credential
  try {
    credential = readCertificateCredential(pem, option('thumbprint'))
  } catch (error) {
    fail(error instanceof ProxyError ? error.message : String(error))
  }

  console.log(`\n  thumbprint  ${credential.thumbprintHex}`)
  const leaf = leafCertificateOf(pem)
  if (leaf) {
    console.log(`  subject     ${leaf.subject}`)
    console.log(`  expires     ${new Date(leaf.validTo).toISOString().slice(0, 10)}`)
  }

  const tenantId = option('tenant')
  const clientId = option('client-id', process.env.GRAPH_CLIENT_ID ?? null)
  if (!tenantId) {
    console.log('\n  The credential is well formed. Add --tenant <id> --client-id <id> to ask Entra itself.\n')
    return
  }
  if (!clientId) fail('--tenant needs --client-id (or GRAPH_CLIENT_ID) to name the registration.')

  const authorityHost = (process.env.ENTRA_AUTHORITY_HOST ?? PUBLIC_AUTHORITY_HOST).replace(/\/+$/, '')
  const endpoint = tokenEndpoint(authorityHost, tenantId)
  const assertion = await buildClientAssertion(
    clientId,
    endpoint,
    { kind: 'certificate', ...credential },
    await importPKCS8(credential.privateKeyPem, 'RS256'),
  )
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'client_credentials',
      scope: `${(process.env.GRAPH_ORIGIN ?? PUBLIC_GRAPH_ORIGIN).replace(/\/+$/, '')}/.default`,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string
    error_description?: string
  }

  console.log(`\n  ${endpoint}\n  HTTP ${response.status}`)
  if (payload.access_token) {
    const roles = JSON.parse(
      Buffer.from(payload.access_token.split('.')[1], 'base64url').toString('utf8'),
    ) as { roles?: string[] }
    console.log(`  Entra issued an app-only token. Roles: ${roles.roles?.join(', ') || '(none granted yet)'}\n`)
    return
  }

  const description = payload.error_description ?? 'no error_description'
  const [code] = /AADSTS\d+/.exec(description) ?? []
  const meaning: Record<string, string> = {
    AADSTS700027: 'Entra read the assertion but found no certificate with this thumbprint on the registration — upload it.',
    AADSTS700016: 'The registration is not present in this tenant — an administrator must grant admin consent first.',
    AADSTS7000215: 'A client secret was sent instead of the assertion.',
    AADSTS900023: 'The tenant id is not a tenant.',
  }
  console.log(`  ${description.split('\n')[0]}`)
  if (code && meaning[code]) console.log(`\n  ${code}: ${meaning[code]}`)
  console.log()
  process.exitCode = 1
}

if (command === 'new') generate()
else if (command === 'check') await check()
else fail(`Unknown command "${command}". Use "new" or "check".`)
