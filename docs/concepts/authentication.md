# Authentication

The auth system for maltty CLIs. Provides credential resolution from multiple sources, an interactive login flow, persistent token storage, and automatic HTTP header injection.

Auth is a sub-export of the `@maltty/core` package (`@maltty/core/auth`), not a separate package. It ships as middleware that decorates `ctx.auth` with a `credential()` reader, a `login()` method, and a `logout()` method.

## Key Concepts

### Passive vs Interactive Resolution

Auth strategies are split into two categories:

- **Passive** strategies run automatically when the middleware initializes. They check non-interactive sources (file store, environment variables) without prompting the user. The first match wins.
- **Interactive** strategies run only when the handler explicitly calls `ctx.auth.login()`. They prompt the user (OAuth browser flow, password input) or call a custom function.

This split allows commands to work without auth when no credential is found, and only prompt when a command actually needs authentication.

### Credential Types

All credentials use a discriminated union on the `type` field:

| Type      | Interface          | HTTP Header                              |
| --------- | ------------------ | ---------------------------------------- |
| `bearer`  | `BearerCredential` | `Authorization: Bearer <token>`          |
| `basic`   | `BasicCredential`  | `Authorization: Basic base64(user:pass)` |
| `api-key` | `ApiKeyCredential` | `<headerName>: <key>`                    |
| `custom`  | `CustomCredential` | Arbitrary `headers` record               |

```ts
interface BearerCredential {
  readonly type: 'bearer'
  readonly token: string
}

interface BasicCredential {
  readonly type: 'basic'
  readonly username: string
  readonly password: string
}

interface ApiKeyCredential {
  readonly type: 'api-key'
  readonly headerName: string
  readonly key: string
}

interface CustomCredential {
  readonly type: 'custom'
  readonly headers: Readonly<Record<string, string>>
}
```

### Token Storage

Credentials are persisted as JSON files using maltty's file store system.

| Location | Path                     | Resolution order |
| -------- | ------------------------ | ---------------- |
| Local    | `./<cli-name>/auth.json` | Checked first    |
| Global   | `~/<cli-name>/auth.json` | Checked second   |

The file contains the raw credential object:

```json
{
  "type": "bearer",
  "token": "ghp_abc123..."
}
```

Credentials loaded from disk are validated against a Zod schema. Invalid data is silently ignored (returns null).

## Resolver Builders

The `auth` function doubles as a namespace with builder methods for constructing strategy configs. Each builder returns the same `StrategyConfig` type with the `source` discriminator pre-filled. Raw config objects (`{ source: 'env' }`) still work.

```ts
import { auth } from '@maltty/core/auth'

auth({
  strategies: [
    // Passive (run automatically)
    auth.env(),
    auth.env({ tokenVar: 'GH_TOKEN' }),
    auth.dotenv(),
    auth.dotenv({ tokenVar: 'API_TOKEN', path: '.env.local' }),
    auth.file(),
    auth.file({ filename: 'creds.json', dirName: '.my-app' }),

    // Interactive (run on ctx.auth.login())
    auth.oauth({
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
      scopes: ['openid', 'profile'],
    }),
    auth.deviceCode({
      clientId: 'my-client-id',
      deviceAuthUrl: 'https://example.com/device/code',
      tokenUrl: 'https://example.com/token',
    }),
    auth.token(),
    auth.token({ message: 'Enter token:' }),
    auth.custom(async () => {
      const token = await fetchTokenFromVault()
      return token ? { type: 'bearer', token } : null
    }),

    // Raw config objects still work (backward compatible)
    { source: 'env', tokenVar: 'LEGACY_TOKEN' },
  ],
})
```

## Resolvers

### `env` -- Environment Variable

Reads a bearer token from `process.env`.

```ts
auth.env({ tokenVar: 'GITHUB_TOKEN' })
```

| Option     | Type     | Default            | Description               |
| ---------- | -------- | ------------------ | ------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Environment variable name |

The default variable name is derived from the CLI name: `my-app` becomes `MY_APP_TOKEN`.

### `dotenv` -- Dotenv File

Reads a bearer token from a `.env` file without mutating `process.env`.

```ts
auth.dotenv({ tokenVar: 'API_TOKEN', path: './.env.local' })
```

| Option     | Type     | Default            | Description                   |
| ---------- | -------- | ------------------ | ----------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Variable name within the file |
| `path`     | `string` | `$CWD/.env`        | Path to the dotenv file       |

### `file` -- JSON File

Reads any credential type from a JSON file on disk via maltty's store system.

```ts
auth.file({ filename: 'auth.json', dirName: '.my-app' })
```

| Option     | Type     | Default       | Description                   |
| ---------- | -------- | ------------- | ----------------------------- |
| `filename` | `string` | `'auth.json'` | Filename within the store dir |
| `dirName`  | `string` | `.<cli-name>` | Store directory name          |

### `oauth` -- OAuth Authorization Code + PKCE (RFC 7636)

Implements the standard OAuth 2.0 Authorization Code flow with Proof Key for Code Exchange (PKCE) per [RFC 7636](https://tools.ietf.org/html/rfc7636) and [RFC 8252](https://tools.ietf.org/html/rfc8252) for native apps.

The flow:

1. CLI generates a `code_verifier` and derives the `code_challenge` (S256)
2. CLI starts a local HTTP server on `127.0.0.1` and opens the browser to the authorization URL
3. User authenticates in the browser; the authorization server redirects back to the local server with an authorization code via GET
4. CLI exchanges the code at the token endpoint with the `code_verifier`
5. Token endpoint validates the verifier and returns an access token

```ts
auth.oauth({
  clientId: 'my-client-id',
  authUrl: 'https://example.com/authorize',
  tokenUrl: 'https://example.com/token',
  scopes: ['openid', 'profile'],
})
```

| Option         | Type                | Default       | Description                       |
| -------------- | ------------------- | ------------- | --------------------------------- |
| `clientId`     | `string`            | --            | OAuth client ID (required)        |
| `authUrl`      | `string`            | --            | Authorization endpoint (required) |
| `tokenUrl`     | `string`            | --            | Token endpoint (required)         |
| `scopes`       | `readonly string[]` | `[]`          | OAuth scopes to request           |
| `port`         | `number`            | `0` (random)  | Local callback server port        |
| `callbackPath` | `string`            | `'/callback'` | Callback endpoint path            |
| `timeout`      | `number`            | `120_000`     | Timeout in milliseconds           |

Compatible with any OAuth 2.0 provider that supports PKCE with public clients, including Clerk (configured as a public OAuth application).

### `device-code` -- Device Authorization Grant (RFC 8628)

Implements the [OAuth 2.0 Device Authorization Grant](https://tools.ietf.org/html/rfc8628) for headless or browserless environments.

The flow:

1. CLI requests a device code from the authorization server
2. CLI displays a verification URL and user code for the user to enter in a browser
3. CLI polls the token endpoint until the user completes authorization
4. Token endpoint returns an access token on success

```ts
auth.deviceCode({
  clientId: 'my-client-id',
  deviceAuthUrl: 'https://example.com/device/code',
  tokenUrl: 'https://example.com/token',
  scopes: ['openid'],
})
```

| Option          | Type                | Default   | Description                              |
| --------------- | ------------------- | --------- | ---------------------------------------- |
| `clientId`      | `string`            | --        | OAuth client ID (required)               |
| `deviceAuthUrl` | `string`            | --        | Device authorization endpoint (required) |
| `tokenUrl`      | `string`            | --        | Token endpoint (required)                |
| `scopes`        | `readonly string[]` | `[]`      | OAuth scopes to request                  |
| `pollInterval`  | `number`            | `5_000`   | Poll interval in milliseconds            |
| `timeout`       | `number`            | `300_000` | Timeout in milliseconds                  |

The device code flow handles RFC 8628 error codes: `authorization_pending` (continue polling), `slow_down` (increase interval), `expired_token` (return null), and `access_denied` (return null).

Supported by GitHub, Azure AD, and Google. Not supported by Clerk.

### `token` -- Interactive Token Input

Prompts the user for a token via a masked password input. Aliased as `auth.apiKey()`.

```ts
auth.token({ message: 'Enter your API token:' })
```

| Option    | Type     | Default                | Description    |
| --------- | -------- | ---------------------- | -------------- |
| `message` | `string` | `'Enter your API key'` | Prompt message |

### `custom` -- User-Provided Function

Calls a user-supplied function that returns a credential or null. The function is passed directly as the argument (not wrapped in an options object).

```ts
auth.custom(async () => {
  const token = await fetchTokenFromVault()
  return token ? { type: 'bearer', token } : null
})
```

## AuthContext

The auth middleware decorates `ctx.auth` with an `AuthContext`:

| Property          | Type                                     | Description                                     |
| ----------------- | ---------------------------------------- | ----------------------------------------------- |
| `credential()`    | `AuthCredential \| null`                 | Passively resolved credential (file, env)       |
| `authenticated()` | `boolean`                                | Whether a passive credential exists             |
| `login(options?)` | `AsyncResult<AuthCredential, AuthError>` | Run interactive strategies, persist, and return |
| `logout()`        | `AsyncResult<string, AuthError>`         | Remove stored credential from disk              |

`login()` accepts an optional `LoginOptions` object to override strategies or add a validate callback for a single login attempt:

| LoginOptions Field | Type                        | Description                                      |
| ------------------ | --------------------------- | ------------------------------------------------ |
| `strategies`       | `readonly StrategyConfig[]` | Override the default strategy list for this call |
| `validate`         | `ValidateCredential`        | Validate the credential before persisting        |

### `ctx.auth.login()`

Walks the configured strategies in order, runs each interactive strategy, and persists the first successful credential to the global file store.

```ts
const [error, credential] = await ctx.auth.login()
if (error) {
  ctx.fail(error.message)
}
```

### `ctx.auth.logout()`

Removes the stored credential file from the global file store. Returns `ok(filePath)` on success, including when the file did not exist (idempotent).

```ts
const [error] = await ctx.auth.logout()
if (error) {
  ctx.fail(error.message)
}
```

### AuthError

| AuthError `type`      | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `'no_credential'`     | No strategy produced a credential                    |
| `'save_failed'`       | Credential resolved but failed to persist            |
| `'remove_failed'`     | Failed to remove the credential file                 |
| `'validation_failed'` | Credential resolved but failed the validate callback |

## Requiring Authentication

Auth is opt-in by default. The `auth()` middleware decorates `ctx.auth` with credential readers but never blocks command execution. Commands that run without a credential (public commands, the login command itself) work without any extra configuration.

Use the built-in `auth.require()` helper to create a middleware that checks `ctx.auth.authenticated()` and calls `ctx.fail()` to short-circuit before the handler runs:

```ts
import { auth } from '@maltty/core/auth'

const requireAuth = auth.require()
```

You can customize the error message:

```ts
const requireAuth = auth.require({ message: 'Not authenticated. Run `my-app login` first.' })
```

Alternatively, write a custom middleware for full control:

```ts
import { middleware } from '@maltty/core'

const requireAuth = middleware((ctx, next) => {
  if (!ctx.auth.authenticated()) {
    return ctx.fail('Not authenticated. Run `my-app login` first.')
  }

  return next()
})
```

### Command-level enforcement

Apply the middleware to individual commands via the `middleware` array. This is the recommended approach when only some commands require authentication (login, help, and version remain open).

```ts
import { command } from '@maltty/core'
import { auth } from '@maltty/core/auth'

const requireAuth = auth.require()

export default command({
  description: 'List repositories',
  middleware: [requireAuth],
  handler: async (ctx) => {
    // handler logic here
  },
})
```

### Global enforcement

Apply the middleware to the root `middleware` array to enforce authentication on every command. Place it after `auth()` since it depends on `ctx.auth`.

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [auth({ strategies: [auth.env(), auth.token()] }), auth.require()],
  commands: `${import.meta.dirname}/commands`,
})
```

When applied globally, all commands -- including login -- must pass the check. Use command-level enforcement when some commands need to run unauthenticated.

See the [Add Authentication guide](../guides/add-authentication.md#3-guard-commands-that-require-auth) for step-by-step instructions.

## HTTP Integration

Auth and HTTP are separate middleware. The `http()` middleware (from `@maltty/core/http`) creates a typed HTTP client on `ctx[namespace]`. To inject auth credentials into HTTP requests automatically, use `auth.headers()` as the `headers` option on `http()`.

`auth.headers()` returns a function `(ctx) => headers` that reads `ctx.auth.credential()` and converts it into the appropriate HTTP header format. It returns an empty record when no auth middleware is present or no credential exists.

```ts
import { cli } from '@maltty/core'
import { auth } from '@maltty/core/auth'
import { http } from '@maltty/core/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      strategies: [
        auth.env(),
        auth.oauth({
          clientId: 'my-client-id',
          authUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
        }),
      ],
    }),
    http({
      baseUrl: 'https://api.example.com',
      namespace: 'api',
      headers: auth.headers(),
    }),
  ],
  commands: { login, repos },
})
```

Place `auth()` before `http()` in the middleware array so that `ctx.auth` is available when HTTP requests resolve headers.

Multiple HTTP clients work the same way:

```ts
middleware: [
  auth({ strategies: [auth.env()] }),
  http({
    baseUrl: 'https://api.example.com',
    namespace: 'api',
    headers: auth.headers(),
  }),
  http({
    baseUrl: 'https://admin.example.com',
    namespace: 'admin',
    headers: auth.headers(),
  }),
],
```

Both `ctx.api` and `ctx.admin` get auth credential headers injected automatically.

### `http()` without auth

The `http()` middleware does not require `auth()`. Use it standalone for public APIs or when providing headers explicitly.

```ts
import { http } from '@maltty/core/http'

// Static headers
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: { 'X-Api-Key': 'abc123' },
})

// Dynamic headers via function
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: (ctx) => ({
    'X-App-Name': ctx.meta.name,
  }),
})

// No headers (public API)
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
})
```

## Resources

- [RFC 7636 -- Proof Key for Code Exchange](https://tools.ietf.org/html/rfc7636)
- [RFC 8252 -- OAuth 2.0 for Native Apps](https://tools.ietf.org/html/rfc8252)
- [RFC 8628 -- Device Authorization Grant](https://tools.ietf.org/html/rfc8628)

## References

- [Core Reference](../reference/maltty.md)
- [Context](./context.md)
- [Add Authentication Guide](../guides/add-authentication.md)
