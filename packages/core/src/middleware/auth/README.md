# Auth Middleware

Resolve credentials from multiple sources and store them in the context for downstream middleware and commands. Strategies are tried in order; the first successful match wins.

## Usage

```ts
import { cli } from '@maltty/core'
import { auth } from '@maltty/core/auth'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      strategies: [auth.env()],
    }),
  ],
  commands: { deploy },
})
```

The middleware decorates `ctx.auth` with `credential()`, `authenticated()`, `login()`, and `logout()` methods.

## Strategy Builders

`auth` doubles as a namespace with builder methods for constructing strategy configs. Each builder returns a `StrategyConfig` with the `source` discriminator pre-filled. Raw config objects (`{ source: 'env' }`) still work.

```ts
auth({
  strategies: [
    auth.env(),
    auth.dotenv({ path: '.env.local' }),
    auth.file(),
    auth.oauth({ clientId: '...', authUrl: '...', tokenUrl: '...' }),
    auth.deviceCode({ clientId: '...', deviceAuthUrl: '...', tokenUrl: '...' }),
    auth.token({ message: 'Enter token:' }),
    auth.custom(async () => fetchToken()),
  ],
})
```

## Strategies

Strategies are tried in declaration order. The first non-null result is stored and remaining strategies are skipped.

### env

Reads a bearer token from `process.env`. The variable name defaults to `<CLI_NAME>_TOKEN` (kebab-case converted to `SCREAMING_SNAKE_CASE`).

```ts
auth({
  strategies: [auth.env({ tokenVar: 'GITHUB_TOKEN' })],
})
```

| Option     | Type     | Default            | Description                  |
| ---------- | -------- | ------------------ | ---------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Environment variable to read |

### dotenv

Reads a bearer token from a `.env` file without mutating `process.env`.

```ts
auth({
  strategies: [auth.dotenv({ path: '.env.local' })],
})
```

| Option     | Type     | Default            | Description                   |
| ---------- | -------- | ------------------ | ----------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Variable name inside the file |
| `path`     | `string` | `$CWD/.env`        | Path to the `.env` file       |

### file

Reads a credential from a JSON file on disk using local-then-global resolution. The middleware looks for `./<dirName>/<filename>` in the current directory first, then in the user's home directory.

```ts
auth({
  strategies: [auth.file({ filename: 'credentials.json', dirName: '.my-app' })],
})
```

| Option     | Type     | Default       | Description                   |
| ---------- | -------- | ------------- | ----------------------------- |
| `filename` | `string` | `auth.json`   | Name of the credentials file  |
| `dirName`  | `string` | `.<cli-name>` | Directory containing the file |

The file must contain a valid credential object (see [Credential Types](#credential-types)).

### oauth

OAuth 2.0 Authorization Code + PKCE (RFC 7636 + RFC 8252). Opens the browser, receives an authorization code via GET redirect, and exchanges it at the token endpoint with a PKCE code verifier.

```ts
auth({
  strategies: [
    auth.oauth({
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
      scopes: ['openid', 'profile'],
    }),
  ],
})
```

| Option         | Type                | Default      | Description                       |
| -------------- | ------------------- | ------------ | --------------------------------- |
| `clientId`     | `string`            | _required_   | OAuth client ID                   |
| `authUrl`      | `string`            | _required_   | Authorization endpoint            |
| `tokenUrl`     | `string`            | _required_   | Token endpoint                    |
| `scopes`       | `readonly string[]` | `[]`         | OAuth scopes to request           |
| `port`         | `number`            | `0` (random) | Local server port                 |
| `callbackPath` | `string`            | `/callback`  | Path the auth server redirects to |
| `timeout`      | `number`            | `120000`     | Timeout in milliseconds           |

### device-code

OAuth 2.0 Device Authorization Grant (RFC 8628). Displays a verification URL and user code, then polls the token endpoint until the user completes authorization.

```ts
auth({
  strategies: [
    auth.deviceCode({
      clientId: 'my-client-id',
      deviceAuthUrl: 'https://example.com/device/code',
      tokenUrl: 'https://example.com/token',
    }),
  ],
})
```

| Option          | Type                | Default    | Description                               |
| --------------- | ------------------- | ---------- | ----------------------------------------- |
| `clientId`      | `string`            | _required_ | OAuth client ID                           |
| `deviceAuthUrl` | `string`            | _required_ | Device authorization endpoint             |
| `tokenUrl`      | `string`            | _required_ | Token endpoint                            |
| `scopes`        | `readonly string[]` | `[]`       | OAuth scopes to request                   |
| `pollInterval`  | `number`            | `5000`     | Poll interval in milliseconds             |
| `timeout`       | `number`            | `300000`   | Timeout in milliseconds                   |
| `openBrowser`   | `boolean`           | `true`     | Open verification URL in browser on start |

Works with providers that implement RFC 8628, including GitHub, Azure AD, Google, Auth0, and Okta. Clerk does not currently expose a device authorization endpoint.

### token

Interactively prompts the user for a token via `ctx.prompts.password()`. Best placed last in the strategy chain as a fallback. Aliased as `auth.apiKey()`.

```ts
auth({
  strategies: [auth.token({ message: 'Enter your GitHub token' })],
})
```

| Option    | Type     | Default              | Description         |
| --------- | -------- | -------------------- | ------------------- |
| `message` | `string` | `Enter your API key` | Prompt message text |

### custom

Supplies a user-defined strategy function. The function is passed directly as the argument (not wrapped in an options object). Returns a credential or `null`.

```ts
auth({
  strategies: [
    auth.custom(async () => {
      const token = await fetchTokenFromVault()
      if (!token) return null
      return { type: 'bearer', token }
    }),
  ],
})
```

## HTTP Integration

When `http` is provided on the auth options, the middleware creates HTTP client(s) with automatic credential header injection alongside `ctx.auth`.

```ts
// Single HTTP client
auth({
  strategies: [auth.env(), auth.oauth({ ... })],
  http: {
    baseUrl: 'https://api.example.com',
    namespace: 'api',
  },
})

// Multiple HTTP clients
auth({
  strategies: [auth.env()],
  http: [
    { baseUrl: 'https://api.example.com', namespace: 'api' },
    { baseUrl: 'https://admin.example.com', namespace: 'admin' },
  ],
})
```

| Option      | Type                     | Default    | Description                                |
| ----------- | ------------------------ | ---------- | ------------------------------------------ |
| `baseUrl`   | `string`                 | _required_ | Base URL for the HTTP client               |
| `namespace` | `string`                 | _required_ | Property name on `ctx` (e.g. `'api'`)      |
| `headers`   | `Record<string, string>` | `{}`       | Additional static headers for all requests |

## Configuration

| Option       | Type               | Default    | Description                                            |
| ------------ | ------------------ | ---------- | ------------------------------------------------------ |
| `strategies` | `StrategyConfig[]` | _required_ | Ordered list of credential sources to try              |
| `http`       | `AuthHttpOptions`  | --         | Optional HTTP client(s) with credential auto-injection |

## Multiple Auth Sources

Chain strategies to support multiple credential discovery methods. The first match wins:

```ts
auth({
  strategies: [
    auth.env({ tokenVar: 'GITHUB_TOKEN' }),
    auth.dotenv(),
    auth.file(),
    auth.token({ message: 'Enter your GitHub token' }),
  ],
})
```

## Credential Types

All strategies produce one of four credential variants, discriminated by the `type` field:

| Type      | Fields                 | Header Format                            |
| --------- | ---------------------- | ---------------------------------------- |
| `bearer`  | `token`                | `Authorization: Bearer <token>`          |
| `basic`   | `username`, `password` | `Authorization: Basic base64(user:pass)` |
| `api-key` | `headerName`, `key`    | `<headerName>: <key>`                    |
| `custom`  | `headers`              | Arbitrary headers from the record        |

The `env`, `dotenv`, `token`, `oauth`, and `device-code` strategies always produce `bearer` credentials. The `file` and `custom` strategies can produce any variant.

## Module Augmentation

Augment `CommandContext` to get typed access to `ctx.auth`:

```ts
declare module '@maltty/core' {
  interface CommandContext {
    readonly auth: AuthContext
  }
}
```
