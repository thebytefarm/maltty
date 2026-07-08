# CLI

Overview of the CLI system -- commands, middleware, the context object, autoloading, and how errors flow from handlers to the terminal.

## Overview

maltty uses [yargs](https://yargs.js.org) for command routing and [`@clack/prompts`](https://www.clack.cc) for styled terminal output. The CLI entry point is in `packages/cli/src/`, which registers all commands and attaches middleware. Each command is implemented using the `command()` factory from `maltty`.

## Commands

Commands are created with the `command()` factory. Each command defines a description, optional args schema, optional subcommands, and a handler function.

| Property      | Type                                      | Description                                                    |
| ------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `description` | `Resolvable<string>`                      | Shown in `--help` output (string or function returning string) |
| `hidden`      | `Resolvable<boolean>`                     | Omit from help output (command still works)                    |
| `deprecated`  | `Resolvable<string \| boolean>`           | Deprecation notice in help and on use                          |
| `args`        | `z.ZodObject` or `YargsArgDef`            | Optional Zod schema or yargs-native arg definitions            |
| `middleware`  | `Middleware[]`                            | Optional command-level middleware (wraps the handler)          |
| `commands`    | `CommandMap` or `Promise<CommandMap>`     | Optional nested subcommands (static or lazy-loaded)            |
| `handler`     | `(ctx: Context) => Promise<void> \| void` | Command execution function                                     |

`Resolvable<T>` means the field accepts either a static value or a zero-argument function that returns the value. Functions are resolved once at registration time.

### With Zod args

```ts
import { command } from 'maltty'
import { z } from 'zod'

export default command({
  description: 'Deploy the application',
  args: z.object({
    environment: z.enum(['staging', 'production']),
    force: z.boolean().optional(),
  }),
  handler: async (ctx) => {
    process.stdout.write(ctx.format.json({ environment: ctx.args.environment }))
  },
})
```

### Without args

```ts
import { command } from 'maltty'

export default command({
  description: 'List available scripts',
  handler: async (ctx) => {
    process.stdout.write(ctx.format.table(scripts))
  },
})
```

### Hidden and deprecated

```ts
// Hidden from --help but still executable
export default command({
  description: 'Internal debug tools',
  hidden: true,
  handler: async (ctx) => {
    /* ... */
  },
})

// Conditionally hidden
export default command({
  description: 'Experimental feature',
  hidden: () => process.env['NODE_ENV'] === 'production',
  handler: async (ctx) => {
    /* ... */
  },
})

// Deprecated with message
export default command({
  description: 'Deploy (legacy)',
  deprecated: 'Use "deploy-v2" instead',
  handler: async (ctx) => {
    /* ... */
  },
})
```

### With subcommands

```ts
import { command, autoload } from 'maltty'

export default command({
  description: 'Auth commands',
  commands: autoload({ dir: './auth' }),
})
```

## Context

Every handler and middleware receives a `Context` object with the following properties:

| Property  | Description                                                |
| --------- | ---------------------------------------------------------- |
| `args`    | Parsed command arguments (typed by Zod schema)             |
| `config`  | Loaded config (typed by config schema, deeply readonly)    |
| `log`     | Logging methods (info, success, error, warn, etc.)         |
| `prompts` | Interactive prompts (confirm, text, select, etc.)          |
| `spinner` | Spinner for long-running operations (start, stop, message) |
| `colors`  | Color formatting utilities (picocolors)                    |
| `format`  | Pure string formatters (json, table) — no I/O              |
| `store`   | In-memory key-value store (mutable, for middleware data)   |
| `fail`    | Throw a user-facing error with clean exit                  |
| `meta`    | CLI name, version, and resolved command path               |

All data properties (`args`, `config`, `meta`) are deeply readonly. The `store` is the only mutable property -- middleware uses it to pass typed data to handlers.

### Store

The store is an in-memory `Map<string, unknown>` with typed accessors:

```ts
ctx.store.set('startTime', Date.now())
ctx.store.get('startTime')
ctx.store.has('startTime')
ctx.store.delete('startTime')
```

Consumers register typed keys via module augmentation:

```ts
declare module 'maltty' {
  interface MalttyStore {
    auth: AuthState
  }
}
```

### Prompts

Interactive prompts suspend execution until user input:

```ts
const confirmed = await ctx.prompts.confirm({ message: 'Continue?' })
const name = await ctx.prompts.text({ message: 'Project name' })
const env = await ctx.prompts.select({
  message: 'Environment',
  options: [
    { value: 'staging', label: 'Staging' },
    { value: 'production', label: 'Production' },
  ],
})
```

Cancellation (Ctrl-C) produces a `ContextError` with code `PROMPT_CANCELLED`.

### Format

Pure string formatters for data serialization (no I/O):

```ts
process.stdout.write(ctx.format.json({ key: 'value' }))
process.stdout.write(ctx.format.table(rows))
```

### Styled Output

Structured output methods on the logger for test results, lint findings, and tallies:

```ts
ctx.report.check({ status: 'pass', name: 'src/auth.test.ts', duration: 42 })
ctx.report.finding({ severity: 'error', rule: 'no-unused-vars', message: '...' })
ctx.report.summary({
  style: 'tally',
  stats: [
    { label: 'Tests', value: `${ctx.colors.green('3 passed')} ${ctx.colors.gray('(3)')}` },
    { label: 'Duration', value: '45ms' },
  ],
})
```

### Errors

User-facing error utility:

```ts
ctx.fail('Config not found')
ctx.fail('Unauthorized', { code: 'AUTH_REQUIRED', exitCode: 1 })
```

`ctx.fail()` throws a `ContextError` that is caught at the CLI boundary for clean exit handling.

## Middleware

Middleware wraps command execution with pre/post logic. Created with the `middleware()` factory. maltty supports middleware at two levels:

### Root middleware

Declared on `cli({ middleware: [...] })`. Runs for every command invocation:

```ts
import { middleware } from 'maltty'

export default middleware(async (ctx, next) => {
  ctx.store.set('startTime', Date.now())
  await next()
  const elapsed = Date.now() - ctx.store.get('startTime')
  ctx.log.info(`Completed in ${elapsed}ms`)
})
```

### Command middleware

Declared on `command({ middleware: [...] })`. Runs only for that command:

```ts
command({
  description: 'Deploy the application',
  middleware: [requireAuth],
  handler: async (ctx) => {
    ctx.log.raw('Deploying')
  },
})
```

### Execution model

Middleware follows an onion model. Root middleware wraps command middleware, which wraps the handler:

```
root middleware start
  command middleware start
    handler
  command middleware end
root middleware end
```

- Each middleware calls `next()` to pass control inward
- Code before `next()` runs on the way in; code after runs on the way out
- A middleware can short-circuit by not calling `next()`
- Data flows between middleware and handlers via `ctx.store`

See [Lifecycle](../../docs/concepts/lifecycle.md) for the full execution model.

## Autoloading

Commands are auto-discovered from a directory via `autoload()`:

```
commands/
├── deploy.ts           -> "deploy" command
├── status.ts           -> "status" command
└── auth/
    ├── index.ts         -> "auth" parent command
    ├── login.ts         -> "auth login" subcommand
    └── logout.ts        -> "auth logout" subcommand
```

**Rules:**

- Files must have a default export created via `command()`
- Extensions: `.ts` or `.js` (not `.d.ts`)
- Ignored: files starting with `_` or `.`, files named `index` (used as parent handlers)
- Subdirectories become parent commands with nested subcommands

## Error Flow

Errors propagate from handlers to the terminal through a single path:

```
Handler calls ctx.fail(message)
  -> Throws ContextError { code, exitCode, message }
  -> Middleware chain unwinds (post-handler code skipped)
  -> CLI boundary catches ContextError
  -> Logs error message via @clack/prompts
  -> Calls process.exit(exitCode)
```

Unexpected errors that escape the handler pattern (parse failures, missing commands) are caught by the global error handler, logged, and exit with code 1.

This design means:

- No handler ever calls `process.exit` directly
- All user-facing error formatting is centralized at the CLI boundary
- Exit codes are explicit and testable
- Lib functions return `Result` tuples instead of throwing

## CLI Entry Point

The `cli()` function wires everything together:

```ts
import { cli, autoload } from 'maltty'

cli({
  name: 'my-tool',
  version: '1.0.0',
  description: 'My CLI tool',
  config: {
    schema: configSchema,
  },
  middleware: [authMiddleware, loggingMiddleware],
  commands: autoload(),
})
```

| Option        | Type                   | Description                                        |
| ------------- | ---------------------- | -------------------------------------------------- |
| `name`        | `string`               | CLI name (used for help text and config discovery) |
| `version`     | `string`               | CLI version (enables `--version` flag)             |
| `description` | `string`               | Help text description                              |
| `config`      | `{ schema, name }`     | Config file loading with Zod validation            |
| `middleware`  | `Middleware[]`         | Root middleware stack (wraps all commands)         |
| `commands`    | `string \| CommandMap` | Commands directory path or static command map      |

## Adding a Command

See the [Adding a CLI Command](../guides/adding-a-cli-command.md) guide for a step-by-step walkthrough.

## References

- [Architecture](./architecture.md)
- [Lifecycle](../../docs/concepts/lifecycle.md)
- [Errors](../standards/typescript/errors.md)
- [Design Patterns](../standards/typescript/design-patterns.md)
