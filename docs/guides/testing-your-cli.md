# Testing Your CLI

maltty ships test utilities at `maltty/test` so you can test commands, middleware, and full CLI pipelines without mocking `@clack/prompts` or wiring up streams by hand.

## Install

The utilities live inside `maltty` -- no extra package required:

```ts
import { createTestContext, runHandler, runMiddleware, runCommand, mockPrompts } from 'maltty/test'
```

## Unit Testing Commands

Use `runHandler` to execute a single command handler in isolation:

```ts
import { describe, expect, it } from 'vitest'
import { command } from 'maltty'
import { runHandler } from 'maltty/test'

const greet = command({
  handler(ctx) {
    ctx.log.raw(`Hello, ${ctx.args.name}!`)
  },
})

describe('greet', () => {
  it('should greet the user by name', async () => {
    const { stdout } = await runHandler({
      cmd: greet,
      overrides: { args: { name: 'Alice' } },
    })
    expect(stdout()).toBe('Hello, Alice!\n')
  })

  it('should capture ctx.fail errors', async () => {
    const failCmd = command({
      handler(ctx) {
        ctx.fail('missing name')
      },
    })
    const { error } = await runHandler({ cmd: failCmd })
    expect(error?.message).toBe('missing name')
  })
})
```

## Unit Testing Middleware

Use `runMiddleware` to execute a middleware chain with a test context:

```ts
import { describe, expect, it } from 'vitest'
import { middleware, decorateContext } from 'maltty'
import { runMiddleware } from 'maltty/test'

const loadUser = middleware(async (ctx, next) => {
  decorateContext(ctx, 'user', { id: 'u-1', name: 'Alice' })
  await next()
})

describe('loadUser', () => {
  it('should decorate context with user', async () => {
    const { ctx } = await runMiddleware({ middlewares: [loadUser] })
    expect(ctx.user).toEqual({ id: 'u-1', name: 'Alice' })
  })
})
```

## Testing with Prompts

Use `mockPrompts` to pre-program prompt responses without touching `@clack/prompts`:

```ts
import { describe, expect, it } from 'vitest'
import { command } from 'maltty'
import { runHandler, mockPrompts } from 'maltty/test'

const deploy = command({
  async handler(ctx) {
    const confirmed = await ctx.prompts.confirm({ message: 'Deploy to production?' })
    if (confirmed) {
      ctx.log.raw('Deploying...')
    }
  },
})

describe('deploy', () => {
  it('should deploy when confirmed', async () => {
    const prompts = mockPrompts({ confirm: [true] })
    const { stdout } = await runHandler({ cmd: deploy, overrides: { prompts } })
    expect(stdout()).toContain('Deploying...')
  })

  it('should skip deploy when denied', async () => {
    const prompts = mockPrompts({ confirm: [false] })
    const { stdout } = await runHandler({ cmd: deploy, overrides: { prompts } })
    expect(stdout()).toBe('')
  })
})
```

`mockPrompts` accepts queues for each prompt type. Responses are consumed in order:

```ts
const prompts = mockPrompts({
  confirm: [true, false], // First confirm returns true, second returns false
  text: ['Alice', 'admin'], // First text returns 'Alice', second returns 'admin'
  select: ['production'], // First select returns 'production'
  multiselect: [['a', 'b']], // First multiselect returns ['a', 'b']
  password: ['secret123'], // First password returns 'secret123'
})
```

## Building a Test Context Manually

Use `createTestContext` when you need a context without running a handler:

```ts
import { createTestContext } from 'maltty/test'

const { ctx, stdout } = createTestContext({
  args: { name: 'Alice', verbose: true },
  meta: { command: ['deploy'], name: 'my-cli', version: '1.0.0' },
})

ctx.log.raw('hello')
expect(stdout()).toBe('hello\n')
```

## Integration Testing

Use `runCommand` to test the full CLI pipeline including arg parsing, middleware, and handlers:

```ts
import { describe, expect, it } from 'vitest'
import { command } from 'maltty'
import { runCommand } from 'maltty/test'

const greet = command({
  options: { name: { type: 'string', required: true } },
  handler(ctx) {
    ctx.log.raw(`Hello, ${ctx.args.name}!`)
  },
})

describe('CLI integration', () => {
  it('should parse args and run the handler', async () => {
    const { exitCode } = await runCommand({
      args: ['greet', '--name', 'Alice'],
      commands: { greet },
    })
    expect(exitCode).toBeUndefined() // No exit = success
  })
})
```

## Testing with Auth

Commands that depend on `ctx.auth` need the auth context decorated before the handler runs. Use `createTestContext` and `decorateContext` to attach a mock auth object:

```ts
import { describe, expect, it } from 'vitest'
import { command, decorateContext } from 'maltty'
import { createTestContext } from 'maltty/test'

const whoami = command({
  async handler(ctx) {
    if (!ctx.auth.authenticated()) {
      ctx.fail('Not authenticated')
    }
    ctx.logger.print('Logged in')
  },
})

describe('whoami', () => {
  it('should print when authenticated', () => {
    const { ctx, stdout } = createTestContext()

    decorateContext(ctx, 'auth', {
      authenticated: () => true,
      credential: () => ({ type: 'bearer', token: 'test-token' }),
      login: async () => [null, { type: 'bearer', token: 'test-token' }],
      logout: async () => [null, '~/.my-app/auth.json'],
    })

    whoami.handler(ctx)
    expect(stdout()).toContain('Logged in')
  })

  it('should fail when not authenticated', () => {
    const { ctx } = createTestContext()

    decorateContext(ctx, 'auth', {
      authenticated: () => false,
      credential: () => null,
      login: async () => [{ type: 'no_credential', message: 'No credential' }, null],
      logout: async () => [null, ''],
    })

    expect(() => whoami.handler(ctx)).toThrow('Not authenticated')
  })
})
```

## Testing with Config

Commands that use `ctx.config` expect a `ConfigHandle` with a `load()` method. Use `createTestContext` and `decorateContext` to attach a mock config handle:

```ts
import { describe, expect, it } from 'vitest'
import { command, decorateContext } from 'maltty'
import { createTestContext } from 'maltty/test'

const status = command({
  async handler(ctx) {
    const [error, result] = await ctx.config.load()
    if (error) {
      ctx.fail(error.message)
      return
    }
    ctx.logger.print(`API: ${result.config.apiUrl}`)
  },
})

describe('status', () => {
  it('should display the configured API URL', async () => {
    const { ctx, stdout } = createTestContext()

    decorateContext(ctx, 'config', {
      load: async () => [null, { config: { apiUrl: 'https://api.example.com' } }],
    })

    await status.handler(ctx)
    expect(stdout()).toContain('https://api.example.com')
  })
})
```

## Testing Icons

Commands that use `ctx.icons` need the icons context decorated. Use `createTestContext` and `decorateContext` to attach a mock:

```ts
import { describe, expect, it } from 'vitest'
import { command, decorateContext } from 'maltty'
import { createTestContext } from 'maltty/test'

const deploy = command({
  async handler(ctx) {
    ctx.logger.print(`${ctx.icons.get('deploy')} Deploying...`)
  },
})

describe('deploy', () => {
  it('should include the deploy icon', async () => {
    const { ctx, stdout } = createTestContext()

    decorateContext(ctx, 'icons', {
      get: (name) => (name === 'deploy' ? '[rocket]' : ''),
      has: () => true,
      installed: () => false,
      setup: async () => [null, true],
      category: () => ({}),
    })

    await deploy.handler(ctx)
    expect(stdout()).toContain('[rocket] Deploying...')
  })
})
```

## Test Lifecycle

Use `setupTestLifecycle` to automatically save/restore `process.argv` and stub `process.exit` between tests:

```ts
import { setupTestLifecycle } from 'maltty/test'

const lifecycle = setupTestLifecycle()

it('should exit with code 1 on error', async () => {
  // ... run CLI that triggers an error ...
  expect(lifecycle.getExitSpy()).toHaveBeenCalledWith(1)
})
```

## API Reference

| Function                                     | Purpose                                                              |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `createTestContext(overrides?)`              | Create a fully-mocked Context with captured output                   |
| `runHandler({ cmd, overrides? })`            | Execute a single command handler in isolation                        |
| `runMiddleware({ middlewares, overrides? })` | Execute a middleware chain with a no-op terminal handler             |
| `runCommand(options)`                        | Execute a full CLI pipeline in-process                               |
| `mockPrompts(responses)`                     | Create a Prompts implementation with pre-programmed responses        |
| `setupTestLifecycle()`                       | Wire up beforeEach/afterEach hooks for process.argv and process.exit |
| `createWritableCapture()`                    | Create a writable stream that captures output to a string buffer     |

## Troubleshooting

### Handler throws unexpectedly

**Issue:** `runHandler` rejects instead of returning an error.

**Fix:** `runHandler` catches `ContextError` (from `ctx.fail()`) and returns it as `error`. Other exceptions propagate as rejections. Ensure your handler uses `ctx.fail()` for expected errors.

### Prompts consumed out of order

**Issue:** `mockPrompts` returns the wrong response.

**Fix:** Responses are consumed in call order per type. If your handler calls `confirm` twice, queue two values: `mockPrompts({ confirm: [true, false] })`.
