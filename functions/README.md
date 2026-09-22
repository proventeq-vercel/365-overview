# Graph proxy (Azure Functions)

An HTTP-triggered Azure Function that lets the sneak-peek SPA read Microsoft Graph **app-only**:
the SPA sends its Graph calls here instead of to `graph.microsoft.com`, and the proxy signs them
with a certificate-backed client-credentials token for the caller's tenant. That is the only way
to reach `sites/delta` (and to resolve the name of every site, not just the ones the signed-in
admin can open), because those endpoints answer to application permissions alone and an
application credential can never live in a browser bundle.

It forwards **reads only, from a fixed allowlist, for the tenant the caller signed into**.

## Security model

| Control | How |
| --- | --- |
| Who may call it | An Entra access token for this API (`aud` in `PROXY_AUDIENCES`, `scp` contains `PROXY_SCOPE`) signed by `login.microsoftonline.com`. No token, no route evaluation — the allowlist cannot be probed anonymously. |
| Which tenant is read | The `tid` claim of that token, checked against its issuer. The tenant is **never** a request parameter. |
| Who inside the tenant | The user must hold an admin directory role (`wids`): Global Administrator, Global Reader, SharePoint Administrator or Reports Reader by default (`PROXY_REQUIRED_DIRECTORY_ROLES`). That mirrors the role the delegated usage reports required, so the proxy widens nobody's access. |
| What is forwarded | `GET` on `v1.0/sites/delta`, `v1.0/sites/{id}`, `v1.0/subscribedSkus`, `v1.0/organization`, the four `beta/reports/…UsageDetail` / `…UsageStorage` storage reports, and `POST v1.0/$batch` whose sub-requests are `GET v1.0/sites/{id}`. Query options are allowlisted per route (`$select`, `$format`, paging tokens). Anything else is `404 RouteNotAllowed` and never reaches Graph. |
| What comes back | Status, body, `content-type` and `retry-after` only. `@odata.nextLink` / `@odata.deltaLink` are rewritten to the proxy so paging keeps going through it. |
| The credential | A certificate and its private key in an app setting (`GRAPH_CERT_PEM`, a Key Vault reference in Azure) — the key never leaves the Function, and only the public certificate is uploaded to Entra. A client secret is accepted for local scripted checks only. |
| Browser callers | `PROXY_ALLOWED_ORIGINS` is the CORS allowlist; a request carrying any other `Origin` is refused with 403 before the caller's token is read. |
| Optional tenant lock | `PROXY_ALLOWED_TENANT_IDS` restricts a deployment to named tenants (use it on a dev deployment). |

Errors come back Graph-shaped, `{ "error": { "code", "message" } }`, so the SPA's existing
`ApiError` handling works unchanged. Codes: `Unauthorized` / `InvalidToken` (401),
`TenantNotAllowed` / `DirectoryRoleRequired` / `AdminConsentRequired` (403), `RouteNotAllowed`
(404), `InvalidBatch` (400), `TokenAcquisitionFailed` / `GraphUnreachable` (502).

## Settings

| Setting | Required | Meaning |
| --- | --- | --- |
| `GRAPH_CLIENT_ID` | yes | Application (client) id of the registration holding the Graph **application** roles `Sites.Read.All`, `Reports.Read.All`, `Organization.Read.All`. |
| `GRAPH_CERT_PEM` | yes (or a secret) | The PKCS#8 private key **and** the certificate uploaded to that registration, one after the other. The thumbprint Entra matches (`x5t`) is read from the certificate, so it cannot drift. `\n` is unescaped, so a single-line app setting works. `npm run cert:new` produces the file. |
| `GRAPH_CERT_THUMBPRINT` | only for a key-only PEM | Needed when `GRAPH_CERT_PEM` carries the key alone (a Key Vault *key*, an HSM). If the certificate is present too, this is optional and the proxy refuses to start when the two disagree. |
| `GRAPH_CLIENT_SECRET` | alternative | Client secret instead of the certificate. Local checks only. |
| `PROXY_AUDIENCES` | yes | Comma list of accepted `aud` values for caller tokens, e.g. `api://<client id>,<client id>` (v1 tokens carry the URI form, v2 the bare id). |
| `PROXY_SCOPE` | no | Scope the caller token must carry. Default `access_as_user`. |
| `PROXY_ALLOWED_ORIGINS` | yes | Comma list of SPA origins allowed to call the proxy. |
| `PROXY_ALLOWED_TENANT_IDS` | no | Comma list of tenant ids; unset = any consented tenant. |
| `PROXY_REQUIRED_DIRECTORY_ROLES` | no | Comma list of directory role template ids; unset = the four admin roles above. |
| `PROXY_PUBLIC_URL` | no | The URL the SPA reaches the proxy on, used in rewritten links when it differs from the request host (front door, custom domain). |
| `ENTRA_AUTHORITY_HOST`, `GRAPH_ORIGIN` | no | Only the local stack sets these, to its fake Entra and fake Graph. |

## Running it locally

Everything below runs on this machine with no tenant, no registration and no secrets.

Install once:

```bash
cd ~/Projects/365-overview/functions && npm install
```

### 1. Tests (unit + end-to-end on the local stack)

```bash
cd ~/Projects/365-overview/functions && npm test
```

The integration suite boots a **fake Entra** (JWKS, a token endpoint that verifies the client
assertion's signature and `x5t` against a real self-signed X.509 certificate, hashing its DER
exactly as Entra does, `GET /local/user-token`) and a **fake
Graph** (260 sites with blank `siteUrl`, 120 drives, 180-day trends, SKUs, org, `$batch`,
`sites/delta`, one 429 with `Retry-After`) and drives the real handler over real HTTP.

### 2. The local stack + smoke

```bash
cd ~/Projects/365-overview/functions && npm run local
```

Starts the fakes on `:7080` (Entra) and `:7090` (Graph) and hosts the proxy in-process on
`:7071`, then prints a ready user token and a `curl`. Add `--func` to host it under the **Azure
Functions Core Tools** runtime instead — the same host that runs in Azure:

```bash
cd ~/Projects/365-overview/functions && npm run local -- --func
```

In a second terminal, exercise every call the SPA makes (paged reports through rewritten links,
`$batch` names, `sites/delta` to its `deltaLink`, plus 401 / 404 / preflight):

```bash
cd ~/Projects/365-overview/functions && npm run smoke
```

### 3. The real SPA against the local stack

With `npm run local` running, from the repo root:

```bash
cd ~/Projects/365-overview && VITE_GRAPH_PROXY_URL=http://127.0.0.1:7071/api/graph VITE_LOCAL_AUTH_URL=http://127.0.0.1:7080 npm run dev
```

`VITE_LOCAL_AUTH_URL` is honoured **only by the Vite dev server** (`import.meta.env.DEV`); a
build ignores it, so it cannot ship. The SPA then skips MSAL the way mock mode does, takes its
caller token from the fake Entra and renders the whole report through the proxy.

## Validating against a real tenant before deploying

0. **Make the certificate.** It is generated here; only the public half is ever uploaded.

   ```bash
   cd ~/Projects/365-overview/functions && npm run cert:new
   ```

   That writes `.temp/graph-proxy.pem` (key + certificate — this is `GRAPH_CERT_PEM`) and
   `.temp/graph-proxy.crt` (upload this one), and prints the thumbprint and expiry.

1. **Registration.** On the registration the proxy will use (the multi-tenant *Storage Analyser*
   `84e24db0-…`, or a second one dedicated to the proxy):
   - **API permissions → Application**: `Sites.Read.All`, `Reports.Read.All`,
     `Organization.Read.All`.
   - **Certificates & secrets**: upload `.temp/graph-proxy.crt`
     (`az ad app credential reset --id <client id> --cert @.temp/graph-proxy.crt --append`).
   - **Expose an API**: set the Application ID URI (`api://<client id>`) and add the scope
     `access_as_user`. If the SPA is a different registration, add it under *Authorized client
     applications* so its users are not prompted twice.
   - An administrator of each tenant grants the application roles once:
     `https://login.microsoftonline.com/{tenant}/adminconsent?client_id=<client id>&redirect_uri=<spa url>`.

2. **Ask Entra whether it accepts the certificate**, before anything else is wired up:

   ```bash
   cd ~/Projects/365-overview/functions && npm run cert:check -- --pem .temp/graph-proxy.pem --client-id <client id> --tenant <tenant id>
   ```

   It prints the roles on the issued token, or explains the `AADSTS` code it got back —
   `700027` means the certificate is not uploaded yet, `700016` that the tenant has not consented.

3. **Local settings.** Copy `local.settings.json.example` to `local.settings.json` (git-ignored)
   and fill `GRAPH_CLIENT_ID`, `GRAPH_CERT_PEM` (the contents of `.temp/graph-proxy.pem`),
   `PROXY_AUDIENCES`, `PROXY_ALLOWED_ORIGINS=http://localhost:5173`. Add
   `PROXY_ALLOWED_TENANT_IDS=<dev tenant>` so the local build cannot serve anyone else.

4. **Run the host:**

   ```bash
   cd ~/Projects/365-overview/functions && npm start
   ```

5. **Run the SPA against it**, signing in with a real admin of the dev tenant:

   ```bash
   cd ~/Projects/365-overview && VITE_GRAPH_PROXY_URL=http://localhost:7071/api/graph npm run dev
   ```

   The consent prompt now asks for `access_as_user` only. Every report section should load; the
   Functions console shows one token request per tenant and one Graph call per page.

6. **Scripted check** with a real token (paste one from the browser's network tab):

   ```bash
   cd ~/Projects/365-overview/functions && USER_TOKEN=<token> PROXY_URL=http://localhost:7071/api/graph npm run smoke
   ```

## Deploying

The Function App needs Node 20+ and these app settings; store the PEM in Key Vault and reference
it (`@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<name>/)`) with the
Function's managed identity granted *Key Vault Secrets User*. `authLevel` is `anonymous` on
purpose: the Entra token is the authentication, and a function key in a browser bundle would be
public. Set `PROXY_ALLOWED_ORIGINS` to the Vercel origin(s) and `PROXY_PUBLIC_URL` if a custom
domain fronts the app.

```bash
cd ~/Projects/365-overview/functions && npm run build && node_modules/.bin/func azure functionapp publish <function-app-name>
```

Then set `VITE_GRAPH_PROXY_URL=https://<function-app>.azurewebsites.net/api/graph` (and
`VITE_GRAPH_PROXY_SCOPE` if the proxy is a separate registration) on the Vercel project.

## Layout

```
functions/
├── src/functions/graphProxy.ts   the Azure Function: HttpRequest → handler → HttpResponseInit
├── src/proxy/
│   ├── config.ts                 settings → ProxyConfig (fails closed on anything missing)
│   ├── certificate.ts            PEM → { private key, thumbprint }, derived from the certificate
│   ├── callerAuth.ts             Entra token → { tenantId, objectId, directoryRoles }
│   ├── allowlist.ts              the routes and query options that may be forwarded; $batch validation
│   ├── appToken.ts               certificate client assertion → per-tenant app token, cached
│   ├── forward.ts                Graph relay + link rewriting
│   └── handler.ts                the pure request pipeline (CORS, auth, allowlist, token, relay)
├── local/                        fake Entra, fake Graph, a self-signed X.509 generator, key
│                                 helpers, a node:http host, the stack
└── scripts/                      local-stack (fakes + host), smoke, and cert (new / check)
```

`npm run typecheck` · `npm test` · `npm run build` are the gates; the root `npm run lint` covers
this folder too.
