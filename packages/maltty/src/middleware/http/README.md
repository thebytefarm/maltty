# HTTP Middleware

Typed HTTP client middleware that decorates the context with a namespaced `HttpClient`.

The standalone `http()` middleware is fully decoupled from auth. For automatic credential header injection, use `auth({ http: { ... } })` from `maltty/auth`.

## Usage

```ts
import { cli } from 'maltty'
import { http } from 'maltty/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    http({
      namespace: 'api',
      baseUrl: 'https://api.example.com',
    }),
  ],
  commands: { fetch },
})
```

The middleware creates an `HttpClient` bound to the base URL and attaches it to `ctx[namespace]`.

## Headers

The `headers` option accepts a static record or a function that receives `ctx` and returns headers.

```ts
// Static headers
http({
  namespace: 'api',
  baseUrl: 'https://api.example.com',
  headers: { 'X-Api-Key': 'abc123' },
})

// Dynamic headers via function
http({
  namespace: 'api',
  baseUrl: 'https://api.example.com',
  headers: (ctx) => ({
    'X-Request-Id': ctx.meta.name,
  }),
})
```

Headers are merged in priority order: per-request > `headers` option.

## Module Augmentation

Augment the `Context` interface so TypeScript knows about the namespace property:

```ts
import type { HttpClient } from 'maltty/http'

declare module 'maltty' {
  interface CommandContext {
    readonly github: HttpClient
  }
}
```

Then use the client inside command handlers:

```ts
const repos = command({
  description: 'List repositories',
  async handler(ctx) {
    const response = await ctx.github.get<Repository[]>('/user/repos')
    ctx.log.info(`Found ${String(response.data.length)} repos`)
  },
})
```

## HttpClient Methods

All methods accept a path (appended to `baseUrl`) and optional `RequestOptions`. Response and body types are parameterized via generics.

| Method   | Signature                                                                      |
| -------- | ------------------------------------------------------------------------------ |
| `get`    | `get<TResponse>(path, options?) => Promise<TypedResponse<TResponse>>`          |
| `post`   | `post<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>`  |
| `put`    | `put<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>`   |
| `patch`  | `patch<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>` |
| `delete` | `delete<TResponse>(path, options?) => Promise<TypedResponse<TResponse>>`       |

## TypedResponse

Every client method returns a `TypedResponse<TData>`:

| Field     | Type       | Description                     |
| --------- | ---------- | ------------------------------- |
| `data`    | `TData`    | Parsed JSON body                |
| `status`  | `number`   | HTTP status code                |
| `headers` | `Headers`  | Response headers                |
| `ok`      | `boolean`  | `true` when status is 200-299   |
| `raw`     | `Response` | The underlying `fetch` Response |

## RequestOptions

Per-request options passed to any client method:

| Field     | Type                     | Description                            |
| --------- | ------------------------ | -------------------------------------- |
| `body`    | `TBody`                  | JSON-serializable request body         |
| `headers` | `Record<string, string>` | Per-request headers (highest priority) |
| `params`  | `Record<string, string>` | URL query parameters                   |
| `signal`  | `AbortSignal`            | Abort signal for cancellation          |

## Configuration

| Option      | Type                                       | Default    | Description                                 |
| ----------- | ------------------------------------------ | ---------- | ------------------------------------------- |
| `namespace` | `string`                                   | _required_ | Property name on `ctx` (e.g. `'github'`)    |
| `baseUrl`   | `string`                                   | _required_ | Base URL for all requests                   |
| `headers`   | `Record<string, string>` or `(ctx) => ...` | `{}`       | Static or dynamic headers for every request |

## Authenticated HTTP Clients

For automatic credential injection, use the `http` option on `auth()` instead of the standalone `http()` middleware:

```ts
import { auth } from 'maltty/auth'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      resolvers: [auth.env({ tokenVar: 'GITHUB_TOKEN' })],
      http: {
        namespace: 'github',
        baseUrl: 'https://api.github.com',
      },
    }),
  ],
  commands: { repos },
})
```

## Standalone Client

Use `createHttpClient` outside the middleware pipeline for scripts or tests:

```ts
import { createHttpClient } from 'maltty/http'

const client = createHttpClient({
  baseUrl: 'https://api.github.com',
  credential: { type: 'bearer', token: process.env['GITHUB_TOKEN'] },
  defaultHeaders: { Accept: 'application/vnd.github.v3+json' },
})

const response = await client.get<Repository[]>('/user/repos')
```
