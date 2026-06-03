# Authenticated Service Example

Demonstrates the maltty `auth` middleware with an integrated HTTP client by building a CLI that makes authenticated requests to a faux API server. Includes an OAuth PKCE authorization code flow, a browser UI for visual testing, and a fallback prompt resolver.

## Structure

```text
authenticated-service/
  api/          # Faux API server (bearer token validation, PKCE OAuth)
  cli/          # maltty CLI with auth middleware (includes HTTP client)
  ui/           # Browser dashboard for testing the API
```

## Setup

From the repo root:

```bash
pnpm install
```

## Running

### Quick start

A single command boots the API server and the CLI dev environment together:

```bash
# from examples/authenticated-service/
pnpm start
```

This starts the faux API on port 3001 in the background and launches `maltty dev` for the CLI. When `maltty dev` exits, the API server is cleaned up automatically.

### CLI commands

```bash
# Authenticate via OAuth PKCE flow (opens browser)
pnpm dev -- login

# Display authenticated user
pnpm dev -- me

# Display as JSON
pnpm dev -- me --json

# List repos
pnpm dev -- repos --json

# Create a repo
pnpm dev -- create-repo --name my-project
```

The CLI tries resolvers in order:

1. `oauth` — opens browser to `http://localhost:3001/authorize` for PKCE authorization code flow
2. `prompt` — falls back to interactive terminal prompt

### Run individually

```bash
pnpm api   # API server only (http://localhost:3001)
pnpm dev   # CLI dev mode only (requires API to be running)
```

### API endpoints

| Endpoint           | Method | Auth     | Description                         |
| ------------------ | ------ | -------- | ----------------------------------- |
| `/health`          | GET    | Public   | Health check                        |
| `/auth`            | GET    | Public   | Browser auth page (UI demo)         |
| `/authorize`       | GET    | Public   | PKCE authorization consent page     |
| `/authorize/grant` | POST   | Public   | Store authorization code (internal) |
| `/token`           | POST   | Public   | Token exchange (PKCE verification)  |
| `/user`            | GET    | Required | Current authenticated user          |
| `/repos`           | GET    | Required | List user's repos                   |
| `/repos`           | POST   | Required | Create a new repo                   |

Valid tokens:

- **Alice**: `tok_alice_12345`
- **Bob**: `tok_bob_67890`

### UI

Open `ui/index.html` in a browser. Select a token, connect, and use the buttons to call API endpoints.

## Auth Middleware Configuration

The CLI uses the `auth()` middleware for credential management and `http()` with `createAuthHeaders()` for authenticated API calls:

```ts
import { auth, createAuthHeaders } from '@maltty/core/auth'
import type { HttpClient } from '@maltty/core/http'
import { http } from '@maltty/core/http'

declare module '@maltty/core' {
  interface Context {
    readonly api: HttpClient
  }
}

cli({
  middleware: [
    auth({
      strategies: [
        auth.oauth({
          authUrl: 'http://localhost:3001/authorize',
          clientId: 'demo-client',
          port: 0,
          timeout: 60_000,
          tokenUrl: 'http://localhost:3001/token',
        }),
        auth.token({ message: 'Enter your API token (see README for valid tokens):' }),
      ],
    }),
    http({
      baseUrl: 'http://localhost:3001',
      headers: createAuthHeaders(),
      namespace: 'api',
    }),
  ],
})
```

### Strategies

| Strategy       | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `auth.oauth()` | Opens browser, runs PKCE authorization code flow with local callback server |
| `auth.token()` | Falls back to interactive terminal input                                    |

### OAuth PKCE flow

1. CLI generates a `code_verifier` and derives a `code_challenge` (SHA-256, base64url)
2. CLI opens browser to `/authorize?response_type=code&client_id=...&code_challenge=...&state=...&redirect_uri=...`
3. User selects a user on the consent page
4. Browser generates an authorization code and POSTs it to `/authorize/grant`
5. Browser redirects to the CLI's local callback server with `?code=...&state=...`
6. CLI exchanges the code at `/token` with `grant_type=authorization_code`, `code_verifier`, etc.
7. Server verifies PKCE (`base64url(sha256(code_verifier)) === stored code_challenge`)
8. Server returns `{ access_token, token_type }` and the CLI stores the token

### HTTP client

The `http()` middleware with `createAuthHeaders()` creates an HTTP client that automatically injects the bearer token from `ctx.auth`. Commands use it as:

```ts
const res = await ctx.api.get<User>('/user')
ctx.log.info(res.data.login)
```
