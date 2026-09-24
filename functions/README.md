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
| Who inside the tenant | Any signed-in user of an allowed tenant, which is what P365 does — its `StorageOverviewController` gates on an active licence and workspace permission, never on a directory role, because its Graph reads are app-only too. `PROXY_ALLOWED_TENANT_IDS` is this proxy's equivalent of the licence. Set `PROXY_REQUIRED_DIRECTORY_ROLES` to also demand a directory role (`wids`) — off by default, because requiring one refused accounts that use P365 itself. |
| What is forwarded | `GET` on `v1.0/sites/delta`, `v1.0/sites/{id}`, `v1.0/subscribedSkus`, `v1.0/organization`, the four `beta/reports/…UsageDetail` / `…UsageStorage` storage reports, and `POST v1.0/$batch` whose sub-requests are `GET v1.0/sites/{id}`. Query options are allowlisted per route (`$select`, `$format`, paging tokens). Anything else is `404 RouteNotAllowed` and never reaches Graph. |
| What comes back | Status, body, `content-type` and `retry-after` only. `@odata.nextLink` / `@odata.deltaLink` are rewritten to the proxy so paging keeps going through it. |
| The credential | A certificate and its private key in an app setting (`GRAPH_CERT_PEM`, a Key Vault reference in Azure) — the key never leaves the Function, and only the public certificate is uploaded to Entra. A client secret is accepted for local scripted checks only. |
| Browser callers | `PROXY_ALLOWED_ORIGINS` is the CORS allowlist; a request carrying any other `Origin` is refused with 403 before the caller's token is read. |
| Application permissions | Every app token must carry all of `Reports.Read.All`, `Sites.Read.All` and `Organization.Read.All` in its `roles` claim. Approving sign-in grants none of them, so a tenant whose administrator only approved sign-in gets `403 AdminConsentRequired` naming the missing ones, and the SPA shows its admin-consent screen instead of a role screen. A token missing any of them is never cached, so a grant takes effect on the next call. |
| Optional tenant lock | `PROXY_ALLOWED_TENANT_IDS` restricts a deployment to named tenants. Unset (the default), the gate is admin consent alone: any tenant that has consented may read **its own** data, which is the multi-tenant behaviour this app is built for. |

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
| `PROXY_REQUIRED_DIRECTORY_ROLES` | no | Comma list of directory role template ids the caller must hold one of. **Unset = no role required.** `DIRECTORY_ROLES` in `config.ts` carries the ids for Global Administrator, Global Reader, SharePoint Administrator and Reports Reader. |
| `PROXY_PUBLIC_URL` | no | The URL the SPA reaches the proxy on, used in rewritten links when it differs from the request host (front door, custom domain). |
| `ENTRA_AUTHORITY_HOST`, `GRAPH_ORIGIN` | no | Only the local stack sets these, to its fake Entra and fake Graph. |

## Running it locally

Everything below runs on this machine with no tenant, no registration and no secrets.

Install once:

```bash
cd ~/projects/365-overview/functions && npm install
```

### 1. Tests (unit + end-to-end on the local stack)

```bash
cd ~/projects/365-overview/functions && npm test
```

The integration suite boots a **fake Entra** (JWKS, a token endpoint that verifies the client
assertion's signature and `x5t` against a real self-signed X.509 certificate, hashing its DER
exactly as Entra does, `GET /local/user-token`) and a **fake
Graph** (260 sites with blank `siteUrl`, 120 drives, 180-day trends, SKUs, org, `$batch`,
`sites/delta`, one 429 with `Retry-After`) and drives the real handler over real HTTP.

### 2. The local stack + smoke

```bash
cd ~/projects/365-overview/functions && npm run local
```

Starts the fakes on `:7080` (Entra) and `:7090` (Graph) and hosts the proxy in-process on
`:7071`, then prints a ready user token and a `curl`. Add `--func` to host it under the **Azure
Functions Core Tools** runtime instead — the same host that runs in Azure, and the one case that
needs `func` on the `PATH` first. Install it **outside this package** so it never reaches a
deployment: `npm i -g azure-functions-core-tools@4`, `winget install
Microsoft.AzureFunctionsCoreTools`, or into any prefix of your own
(`npm install --prefix ~/tools/func azure-functions-core-tools@4`, then add
`~/tools/func/node_modules/.bin` to the `PATH`):

```bash
cd ~/projects/365-overview/functions && npm run local -- --func
```

In a second terminal, exercise every call the SPA makes (paged reports through rewritten links,
`$batch` names, `sites/delta` to its `deltaLink`, plus 401 / 404 / preflight):

```bash
cd ~/projects/365-overview/functions && npm run smoke
```

### 3. The real SPA against the local stack

With `npm run local` running, from the repo root:

```bash
cd ~/projects/365-overview && VITE_GRAPH_PROXY_URL=http://127.0.0.1:7071/api/graph VITE_LOCAL_AUTH_URL=http://127.0.0.1:7080 npm run dev
```

`VITE_LOCAL_AUTH_URL` is honoured **only by the Vite dev server** (`import.meta.env.DEV`); a
build ignores it, so it cannot ship. The SPA then skips MSAL the way mock mode does, takes its
caller token from the fake Entra and renders the whole report through the proxy.

The stack allows `http://localhost:5173` and `http://127.0.0.1:5173` — Vite's default. On any
other port every call dies at the CORS preflight, so name it when starting the stack:

```bash
cd ~/projects/365-overview/functions && npm run local -- --origin=http://localhost:5017
```

## Validating against a real tenant before deploying

0. **Make the certificate.** It is generated here; only the public half is ever uploaded.

   ```bash
   cd ~/projects/365-overview/functions && npm run cert:new
   ```

   That writes `.temp/graph-proxy.pem` (key + certificate — this is `GRAPH_CERT_PEM`) and
   `.temp/graph-proxy.crt` (upload this one), and prints the thumbprint and expiry.

   **Or reuse a certificate the registration already has.** If it lives in Key Vault, download
   the certificate as PFX (the export has an empty password) and turn it into the same PEM bundle
   — key first, certificate second — without ever pasting the key anywhere:

   ```bash
   cd ~/projects/365-overview/functions && mkdir -p .temp && openssl pkcs12 -in ~/Downloads/<name>.pfx -passin pass: -nocerts -nodes | openssl pkcs8 -topk8 -nocrypt > .temp/graph-proxy.pem && openssl pkcs12 -in ~/Downloads/<name>.pfx -passin pass: -clcerts -nokeys | openssl x509 >> .temp/graph-proxy.pem && chmod 600 .temp/graph-proxy.pem
   ```

   `npm run cert:check -- --pem .temp/graph-proxy.pem` prints the thumbprint; it must match one
   under *Certificates & secrets* on the registration.

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
   cd ~/projects/365-overview/functions && npm run cert:check -- --pem .temp/graph-proxy.pem --client-id <client id> --tenant <tenant id>
   ```

   It prints the roles on the issued token, or explains the `AADSTS` code it got back —
   `700027` means the certificate is not uploaded yet, `700016` that the tenant has not consented.
   With a token in hand it then relays one call per application role through the proxy's own
   forwarder (`organization`, `sites/delta`, the SharePoint site report) and prints the status and
   row count of each — `200` all the way down is the certificate proven against real Graph, a `403
   Authorization_RequestDenied` names the role that tenant has not consented to yet. This is the
   whole app-only path; only the caller-token side is left to the browser run below.

3. **Local settings.** Copy `local.settings.json.example` to `local.settings.json` (git-ignored)
   and fill `GRAPH_CLIENT_ID`, `GRAPH_CERT_PEM` (the contents of `.temp/graph-proxy.pem`),
   `PROXY_AUDIENCES`, `PROXY_ALLOWED_ORIGINS=http://localhost:5173`. Add
   `PROXY_ALLOWED_TENANT_IDS=<dev tenant>` so the local build cannot serve anyone else.

4. **Run the host:**

   ```bash
   cd ~/projects/365-overview/functions && npm start
   ```

5. **Run the SPA against it**, signing in with a real admin of the dev tenant:

   ```bash
   cd ~/projects/365-overview && VITE_GRAPH_PROXY_URL=http://localhost:7071/api/graph npm run dev
   ```

   The consent prompt now asks for `access_as_user` only. Every report section should load; the
   Functions console shows one token request per tenant and one Graph call per page.

6. **Scripted check** with a real token (paste one from the browser's network tab):

   ```bash
   cd ~/projects/365-overview/functions && USER_TOKEN=<token> PROXY_URL=http://localhost:7071/api/graph npm run smoke
   ```

## Deploying

Everything below is the Azure CLI (`az login` first). A deploy script is deliberately not written
yet; this is the procedure that has been run by hand and is known to work.

**The proxy gets its own resource group** — never one shared with other workloads. `az group
delete` is then the whole tear-down, and a test deployment cannot be mistaken for, or take down,
anything else.

```bash
az group create --name <rg> --location uksouth
az storage account create --name <storage> --resource-group <rg> --location uksouth --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false --min-tls-version TLS1_2
az functionapp create --name <function-app-name> --resource-group <rg> --storage-account <storage> --flexconsumption-location uksouth --runtime node --runtime-version 22 --assign-identity "[system]"
az functionapp update --name <function-app-name> --resource-group <rg> --set httpsOnly=true
```

Flex Consumption, Node 22, a system-assigned identity. `authLevel` is `anonymous` on purpose: the
Entra token is the authentication, and a function key in a browser bundle would be public. The
platform settings (`FUNCTIONS_WORKER_RUNTIME`, `AzureWebJobsStorage`, the deployment container)
come from `az functionapp create`; the proxy's own are the table above. Put them in a JSON file
so the PEM survives the shell — the bundle as one line with `\n` in place of each newline, which
the proxy unescapes — and delete the file afterwards:

```json
[
  { "name": "GRAPH_CLIENT_ID", "value": "<client id>", "slotSetting": false },
  { "name": "GRAPH_CERT_PEM", "value": "-----BEGIN PRIVATE KEY-----\n…\n-----END CERTIFICATE-----\n", "slotSetting": false },
  { "name": "PROXY_AUDIENCES", "value": "api://<client id>,<client id>", "slotSetting": false },
  { "name": "PROXY_ALLOWED_ORIGINS", "value": "https://<spa host>,http://localhost:5173", "slotSetting": false },
  { "name": "PROXY_ALLOWED_TENANT_IDS", "value": "<dev tenant id>", "slotSetting": false }
]
```

```bash
az functionapp config appsettings set --name <function-app-name> --resource-group <rg> --settings @settings.json
az functionapp cors add --name <function-app-name> --resource-group <rg> --allowed-origins https://<spa host> http://localhost:5173
```

**The same origins must be in the Function App's platform CORS list.** On Azure the Functions
host answers `OPTIONS` preflights itself and never invokes the function for them; with an empty
platform list it returns a bare `204` without `Access-Control-Allow-Origin`, so every browser call
fails at the preflight even though a direct `GET` carries the proxy's own CORS headers. The
platform keeps one `Access-Control-Allow-Origin` per response, it does not duplicate the proxy's;
the proxy's list still decides which origins are served.

`PROXY_ALLOWED_ORIGINS` is an exact list, so every origin that must reach the proxy belongs in it —
including each Vercel preview host if previews are meant to work, since those get a new hostname per
branch. A request carrying an origin outside the list is refused before its token is read.

`PROXY_PUBLIC_URL` is the address the browser reaches the proxy on. It is only needed when the host
the Function sees differs from the one the browser used (a custom domain, a front door); leave it
unset otherwise. It is accepted with or without the `/api/graph` suffix.

**The package** is a production install plus the build, zipped minus `.funcignore` — about 200
files and under 300 KiB: `host.json`, `package.json`, `dist/src/**` and the four runtime packages,
no sources, source maps or tests. `func azure functionapp publish` builds that zip itself
(Core Tools on the PATH: `npm i -g azure-functions-core-tools@4` — deliberately not a dependency of
this package, because the .NET host they carry is over a gigabyte and would land in both CI and
the deployment package); `az functionapp deployment source config-zip … --build-remote false`
takes a zip made any other way that honours `.funcignore`.

```bash
cd ~/projects/365-overview/functions && npm ci && npm run build && npm ci --omit=dev && func azure functionapp publish <function-app-name> && npm ci
```

**Proving a deployment from outside** — none of this needs a caller token:

```bash
curl -si https://<function-app-name>.azurewebsites.net/api/graph/v1.0/organization -H "Origin: https://<spa host>"
```

`401 Unauthorized` with `Access-Control-Allow-Origin` and `Cache-Control: no-store` means the
settings and the certificate loaded (the PEM is parsed and its thumbprint matched before any
request is routed; a broken one answers `500 InvalidConfiguration`). An `OPTIONS` preflight with
`Access-Control-Request-Method: GET` must come back `204` **with** `Access-Control-Allow-Origin`
— a bare `204` is the platform CORS list missing that origin. An unlisted origin gets `403`. A
made-up `Bearer` token gets `401 InvalidToken … no applicable key`, which shows the host reached
Entra's JWKS. After that, the SPA run in *Validating against a real tenant* is the proof of the
whole path: point it at the deployment instead of `localhost:7071`.

**For a long-lived deployment move the PEM to Key Vault**: store the bundle as a secret, grant the
Function's identity *Key Vault Secrets User*, and set `GRAPH_CERT_PEM` to
`@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<name>/)`. A plain app
setting is fine for a test deployment; the Key Vault reference needs a role assignment, which is
an owner-level step.

**The certificate is an expiry-dated credential and the proxy fails closed when it lapses**: every
request answers 500 `InvalidConfiguration` from the moment it expires. `npm run cert:new` dates one
two years out — put its expiry in the calendar, and roll it with
`az ad app credential reset --id <client id> --cert @<new>.crt --append` (append, so the old one
keeps working until the new PEM is in place), then update `GRAPH_CERT_PEM`.

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
