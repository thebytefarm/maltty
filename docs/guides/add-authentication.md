# Add Authentication

Add credential resolution, interactive login, and authenticated HTTP requests to a maltty CLI.

## Prerequisites

- An existing maltty CLI project
- `maltty` installed (`pnpm add maltty`)

## Steps

### 1. Register the auth middleware

Import `auth` from `maltty/auth` and add it to the `middleware` array in `cli()`.

```ts
import { cli } from 'maltty'
import { auth } from 'maltty/auth'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      strategies: [
        auth.oauth({
          clientId: 'my-client-id',
          authUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
        }),
        auth.token({ message: 'Enter your API token:' }),
      ],
    }),
  ],
  commands: `${import.meta.dirname}/commands`,
})
```

The `strategies` array defines which credential sources to try. Order matters -- strategies run in sequence and short-circuit on the first success.

### 2. Add a login command

Create a command that calls `ctx.auth.login()` to run the interactive strategies and persist the credential.

```ts
import { command } from 'maltty'

export default command({
  description: 'Authenticate with the service',
  handler: async (ctx) => {
    const [error] = await ctx.auth.login()

    if (error) {
      ctx.fail(error.message)
    }

    ctx.log.success('Logged in')
  },
})
```

### 3. Add a logout command

Create a command that calls `ctx.auth.logout()` to remove the stored credential from disk.

```ts
import { command } from 'maltty'

export default command({
  description: 'Log out of the service',
  handler: async (ctx) => {
    const [error] = await ctx.auth.logout()

    if (error) {
      ctx.fail(error.message)
    }

    ctx.log.success('Logged out')
  },
})
```

### 4. Guard commands that require auth

Commands that need a credential should reject unauthenticated requests early. There are two approaches: an inline check for one-off guards, and a reusable middleware for consistent enforcement across commands.

#### Inline check

Check `ctx.auth.authenticated()` at the top of the handler.

```ts
import { command } from 'maltty'

export default command({
  description: 'Display the authenticated user',
  handler: async (ctx) => {
    if (!ctx.auth.authenticated()) {
      return ctx.fail('Not authenticated. Run `my-app login` first.')
    }

    ctx.log.info('Authenticated')
  },
})
```

#### Reusable middleware

Write a middleware that checks for a credential and short-circuits before the handler runs. This keeps handlers focused on business logic.

```ts
import { middleware } from 'maltty'

const requireAuth = middleware((ctx, next) => {
  if (!ctx.auth.authenticated()) {
    return ctx.fail('Not authenticated. Run `my-app login` first.')
  }

  return next()
})

export default requireAuth
```

Apply it per-command via the `middleware` array:

```ts
import { command } from 'maltty'
import requireAuth from '../middleware/require-auth.js'

export default command({
  description: 'Display the authenticated user',
  middleware: [requireAuth],
  handler: async (ctx) => {
    ctx.log.info('Authenticated')
  },
})
```

Apply it globally by adding it to the root `middleware` array after `auth()`:

```ts
import { cli } from 'maltty'
import { auth } from 'maltty/auth'
import requireAuth from './middleware/require-auth.js'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      strategies: [
        auth.oauth({
          clientId: 'my-client-id',
          authUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
        }),
      ],
    }),
    requireAuth,
  ],
  commands: `${import.meta.dirname}/commands`,
})
```

When applied globally, every command (including `login`) must pass the check. Exclude the login command by applying `requireAuth` per-command instead of globally.

> **Ordering:** `requireAuth` must come after `auth()` in the middleware array because it depends on `ctx.auth` being decorated.

### 5. Add the HTTP middleware

For authenticated API requests, register the `http()` middleware after `auth()`. It reads `ctx.auth.credential()` automatically and injects the correct HTTP headers.

```ts
import { cli } from 'maltty'
import { auth } from 'maltty/auth'
import { http } from 'maltty/http'

import type { HttpClient } from 'maltty/http'

declare module 'maltty' {
  interface CommandContext {
    readonly api: HttpClient
  }
}

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      strategies: [
        auth.oauth({
          clientId: 'my-client-id',
          authUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
        }),
        auth.token({ message: 'Enter your API token:' }),
      ],
    }),
    http({
      baseUrl: 'https://api.example.com',
      namespace: 'api',
    }),
  ],
  commands: `${import.meta.dirname}/commands`,
})
```

The `namespace` option determines the context property name. With `namespace: 'api'`, the client is available as `ctx.api`.

### 6. Make authenticated requests

Use the typed HTTP client to make requests. Auth headers are injected automatically.

```ts
import { command } from 'maltty'
import { z } from 'zod'

interface Repo {
  readonly id: number
  readonly name: string
  readonly private: boolean
}

const listOptions = z.object({
  json: z.boolean().default(false).describe('Output as JSON'),
})

export default command({
  options: listOptions,
  description: 'List repositories',
  handler: async (ctx) => {
    ctx.status.spinner.start('Fetching repos...')

    const res = await ctx.api.get<Repo[]>('/repos')

    ctx.status.spinner.stop(`Found ${String(res.data.length)} repos`)

    if (ctx.args.json) {
      process.stdout.write(ctx.format.json(res.data))
      return
    }

    const rows = res.data.map((repo) => ({
      Name: repo.name,
      Private: repo.private,
    }))

    process.stdout.write(ctx.format.table(rows))
  },
})
```

### 7. Support environment variables

Add `env` or `dotenv` strategies for non-interactive environments (CI, scripts).

```ts
auth({
  strategies: [
    auth.env({ tokenVar: 'MY_APP_TOKEN' }),
    auth.dotenv(),
    auth.oauth({
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
    }),
    auth.token(),
  ],
})
```

Passive strategies (`env`, `dotenv`, `file`) run automatically on middleware init. Interactive strategies (`oauth`, `device-code`, `token`, `custom`) only run when `ctx.auth.login()` is called.

### 8. Use PKCE with Clerk as the Identity Provider

Configure the OAuth strategy to use Clerk as a public OAuth application with PKCE:

```ts
auth({
  strategies: [
    auth.oauth({
      clientId: '<clerk-oauth-app-id>',
      authUrl: 'https://<clerk-domain>/oauth/authorize',
      tokenUrl: 'https://<clerk-domain>/oauth/token',
      scopes: ['openid', 'profile', 'email'],
    }),
  ],
})
```

### 9. Use the device code flow for headless environments

For environments without a browser (SSH sessions, remote servers), use the device code flow:

```ts
auth({
  strategies: [
    auth.deviceCode({
      clientId: 'my-client-id',
      deviceAuthUrl: 'https://github.com/login/device/code',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scopes: ['repo', 'read:user'],
    }),
  ],
})
```

The CLI displays a URL and a user code. The user opens the URL in any browser (including on a different device), enters the code, and completes authorization.

### 10. Combine multiple strategies

Chain strategies to support multiple authentication methods:

```ts
auth({
  strategies: [
    auth.env({ tokenVar: 'MY_APP_TOKEN' }),
    auth.file(),
    auth.oauth({
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
    }),
    auth.deviceCode({
      clientId: 'my-client-id',
      deviceAuthUrl: 'https://example.com/device/code',
      tokenUrl: 'https://example.com/token',
    }),
    auth.token(),
  ],
})
```

## Verification

```bash
# Login interactively
my-app login

# Verify credential was saved
cat ~/.my-app/auth.json

# Use an authenticated command
my-app repos

# Logout
my-app logout

# Use an environment variable instead
MY_APP_TOKEN=ghp_abc123 my-app repos
```

## Troubleshooting

### OAuth redirect not received

**Issue:** The browser opens but the CLI hangs waiting for the redirect.

**Fix:** Ensure the OAuth provider is configured to redirect to `http://127.0.0.1:<port>/callback` with `code` and `state` query parameters. Verify the `clientId` is correct and the application is configured as a public client with PKCE support. Check that no firewall is blocking the local port.

### Token exchange fails

**Issue:** The redirect is received but no credential is returned.

**Fix:** Verify the `tokenUrl` is correct and accepts `application/x-www-form-urlencoded` POST requests. Ensure the OAuth provider accepts the `code_verifier` parameter for PKCE validation.

### Device code flow times out

**Issue:** The CLI polls but never receives a token.

**Fix:** Verify the `deviceAuthUrl` and `tokenUrl` are correct. Ensure the OAuth provider supports the Device Authorization Grant (RFC 8628). Clerk does not support this flow -- use the `oauth` strategy instead.

### Token not persisted after login

**Issue:** `ctx.auth.credential()` returns null on subsequent runs.

**Fix:** Check that the global store directory (`~/.my-app/`) is writable. Inspect `~/.my-app/auth.json` for valid JSON.

### Wrong environment variable name

**Issue:** The `env` strategy doesn't pick up the token.

**Fix:** The default variable name is derived from the CLI name: `my-app` becomes `MY_APP_TOKEN`. Use `tokenVar` to override if your variable has a different name.

## Resources

- [@clack/prompts](https://www.clack.cc)
- [RFC 7636 -- PKCE](https://tools.ietf.org/html/rfc7636)
- [RFC 8252 -- OAuth for Native Apps](https://tools.ietf.org/html/rfc8252)
- [RFC 8628 -- Device Authorization Grant](https://tools.ietf.org/html/rfc8628)

## References

- [Authentication Concepts](../concepts/authentication.md)
- [Core Reference](../reference/maltty.md)
- [Context](../concepts/context.md)
