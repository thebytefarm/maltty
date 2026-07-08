# middleware()

Define middleware that wraps command execution with pre/post logic.

Import from `maltty`.

```ts
import { middleware } from 'maltty'

const timing = middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.log.info(`Completed in ${Date.now() - start}ms`)
})
```

## Signature

```ts
function middleware<TEnv>(fn: MiddlewareFn): Middleware<TEnv>
```

| Parameter | Type           | Description                      |
| --------- | -------------- | -------------------------------- |
| `fn`      | `MiddlewareFn` | Function receiving `(ctx, next)` |

The `TEnv` type parameter declares environment requirements (e.g., which properties middleware adds to `ctx`).

## Root vs command middleware

**Root middleware** runs for every command. Register on `cli()`:

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [timing, logging],
  commands: { deploy },
})
```

**Command middleware** runs only for a specific command:

```ts
const deploy = command({
  description: 'Deploy the application',
  middleware: [requireAuth],
  async handler(ctx) {
    ctx.log.raw('Deploying')
  },
})
```

Root middleware wraps command middleware, which wraps the handler (onion model).

## decorateContext()

Add a typed, immutable property to a context instance at runtime. Used by middleware authors to extend `ctx` with custom properties.

```ts
import { decorateContext, middleware } from 'maltty'

import type { HttpClient } from 'maltty/http'

declare module 'maltty' {
  interface Context {
    readonly github: HttpClient
  }
}

const github = middleware(async (ctx, next) => {
  decorateContext(ctx, 'github', createHttpClient({ baseUrl: 'https://api.github.com' }))
  await next()
})
```

| Parameter | Type      | Description                             |
| --------- | --------- | --------------------------------------- |
| `ctx`     | `Context` | The context instance (mutated in place) |
| `key`     | `string`  | The property name                       |
| `value`   | `unknown` | The property value                      |

Returns the same `ctx` reference. The property is non-writable and non-configurable after assignment. Pair with module augmentation on the `Context` interface for compile-time visibility.

## References

- [command()](./command.md)
- [cli()](./bootstrap.md)
- [report()](./report.md)
- [Context](../concepts/context.md)
- [Lifecycle](../concepts/lifecycle.md)
