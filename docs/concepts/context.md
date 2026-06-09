# Context

The central API surface threaded through every handler and middleware. Provides typed access to args, config, log, format, store, error handling, and CLI metadata.

## Properties

| Property  | Type                                     | Description                                                                 |
| --------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| `args`    | `DeepReadonly<Merge<MalttyArgs, TArgs>>` | Parsed and validated command args                                           |
| `colors`  | `Colors`                                 | Color formatting utilities (picocolors)                                     |
| `config`  | `ConfigHandle`                           | Lazy config handle with `load()` method (when config middleware registered) |
| `format`  | `Format`                                 | Pure string formatters (no I/O)                                             |
| `log`     | `Log`                                    | Logging methods (info, success, error, warn, etc.)                          |
| `prompts` | `Prompts`                                | Interactive prompts (confirm, text, select, etc.)                           |
| `spinner` | `Spinner`                                | Spinner for long-running operations (start, stop, message)                  |
| `store`   | `Store`                                  | Typed in-memory key-value store                                             |
| `fail`    | `(message, options?) => never`           | Throw a user-facing error                                                   |
| `meta`    | `Meta`                                   | CLI metadata                                                                |
| `auth`    | `AuthContext`                            | Auth credential and login (when `maltty/auth` middleware registered)        |

## `ctx.args`

Deeply readonly parsed args for the matched command. The type is a merge of `MalttyArgs` (global augmentation) and the command's own args definition.

```ts
const deploy = command({
  options: z.object({
    env: z.enum(['staging', 'production']).describe('Target environment'),
  }),
  async handler(ctx) {
    ctx.args.env // 'staging' | 'production'
  },
})
```

## `ctx.config`

A `ConfigHandle` decorated by the `config()` middleware from `maltty/config`. Only present when the config middleware is registered. Config loads lazily by default -- call `ctx.config.load()` to read and validate the config file, which returns a `Result` tuple.

Use `ConfigType` with module augmentation on `maltty/config` to derive `ConfigRegistry` from your Zod schema:

```ts
// src/config.ts
import type { ConfigType } from 'maltty/config'
import { z } from 'zod'

export const configSchema = z.object({
  apiUrl: z.string().url(),
  org: z.string().min(1),
})

declare module 'maltty/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

Then register the config middleware:

```ts
import { cli } from 'maltty'
import { config } from 'maltty/config'
import { configSchema } from './config.js'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [config({ schema: configSchema })],
  commands: import.meta.dirname + '/commands',
})
```

Commands load and access config via the handle:

```ts
export default command({
  async handler(ctx) {
    const [error, result] = await ctx.config.load()
    if (error) {
      ctx.fail(error.message)
      return
    }
    result.config.apiUrl // string
    result.config.org // string
  },
})
```

Pass `{ layers: true }` to `load()` to include layer metadata:

```ts
const [error, result] = await ctx.config.load({ layers: true })
result.config.apiUrl // string
result.layers // ConfigLayer[]
```

Run `maltty add config` to scaffold this setup in an existing project, or pass `--config` to `maltty init` when creating a new project.

## `ctx.log`

Structured logging API on the base context. All logging methods write to stderr.

| Method                    | Description                          |
| ------------------------- | ------------------------------------ |
| `info(message)`           | Log an informational message         |
| `success(message)`        | Log a success message                |
| `error(message)`          | Log an error message                 |
| `warn(message)`           | Log a warning message                |
| `step(message)`           | Log a step indicator                 |
| `message(message, opts?)` | Log a message with optional symbol   |
| `intro(title?)`           | Print an intro banner                |
| `outro(message?)`         | Print an outro banner                |
| `note(message?, title?)`  | Display a boxed note                 |
| `newline()`               | Write a blank line                   |
| `raw(text)`               | Write raw text followed by a newline |

```ts
ctx.log.intro('my-app v1.0.0')
ctx.log.info('Starting deployment...')
ctx.log.success('Deployed successfully')
ctx.log.outro('Done')
```

## `ctx.prompts`

Interactive prompts that suspend execution until the user provides input. Cancellation (Ctrl-C) throws a `ContextError` with code `PROMPT_CANCELLED`.

| Method                 | Returns            | Description        |
| ---------------------- | ------------------ | ------------------ |
| `confirm(opts)`        | `Promise<boolean>` | Yes/no prompt      |
| `text(opts)`           | `Promise<string>`  | Free-text input    |
| `select<T>(opts)`      | `Promise<T>`       | Single-select list |
| `multiselect<T>(opts)` | `Promise<T[]>`     | Multi-select list  |
| `password(opts)`       | `Promise<string>`  | Masked text input  |

```ts
const env = await ctx.prompts.select({
  message: 'Target environment',
  options: [
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'production' },
  ],
})
```

## `ctx.status.spinner`

Manage a spinner for long-running operations.

| Method             | Description                           |
| ------------------ | ------------------------------------- |
| `start(message)`   | Start the spinner with a message      |
| `stop(message)`    | Stop the spinner with a final message |
| `message(message)` | Update the spinner message            |

```ts
ctx.status.spinner.start('Bundling...')
ctx.status.spinner.message('Compiling binaries...')
ctx.status.spinner.stop('Build complete')
```

## `ctx.colors`

Color formatting utilities powered by [picocolors](https://github.com/alexeyraspopov/picocolors). Use for coloring summary values, diagnostic output, and other terminal text.

```ts
const c = ctx.colors
ctx.log.info(`Status: ${c.green('passing')}`)
```

Available formatters: `bold`, `dim`, `italic`, `underline`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, and more.

## `ctx.format`

Pure string formatters for data serialization. These return strings and perform no I/O -- write the result to stdout yourself.

| Method        | Returns  | Description                                         |
| ------------- | -------- | --------------------------------------------------- |
| `json(data)`  | `string` | Serialize a value as pretty-printed JSON            |
| `table(rows)` | `string` | Format an array of objects as an aligned text table |

```ts
// JSON output
process.stdout.write(ctx.format.json({ name: 'deploy', status: 'success' }))

// Table output
process.stdout.write(
  ctx.format.table([
    { name: 'deploy', status: 'success' },
    { name: 'migrate', status: 'skipped' },
  ])
)
```

## `ctx.store`

Typed in-memory key-value store for passing data between middleware and handlers. This is the recommended way to communicate state through the middleware chain.

| Method            | Description                                  |
| ----------------- | -------------------------------------------- |
| `get(key)`        | Get a value (returns `undefined` if not set) |
| `set(key, value)` | Set a value                                  |
| `has(key)`        | Check if a key exists                        |
| `delete(key)`     | Delete a key                                 |
| `clear()`         | Remove all entries                           |

```ts
const loadUser = middleware(async (ctx, next) => {
  ctx.store.set('user', await fetchUser())
  await next()
})

const deploy = command({
  middleware: [loadUser],
  async handler(ctx) {
    const user = ctx.store.get('user')
  },
})
```

## `ctx.fail()`

Throws a `ContextError` with a clean user-facing message. No stack trace is shown in production. The process exits with the specified exit code.

```ts
ctx.fail('Deployment failed')
ctx.fail('Invalid token', { code: 'AUTH_ERROR', exitCode: 2 })
```

| Option     | Type     | Default | Description                 |
| ---------- | -------- | ------- | --------------------------- |
| `code`     | `string` | --      | Machine-readable error code |
| `exitCode` | `number` | `1`     | Process exit code           |

## `ctx.meta`

Deeply readonly CLI metadata.

| Property  | Type           | Description                                                    |
| --------- | -------------- | -------------------------------------------------------------- |
| `name`    | `string`       | CLI name as defined in `cli({ name })`                         |
| `version` | `string`       | CLI version as defined in `cli({ version })`                   |
| `command` | `string[]`     | The resolved command path (e.g. `['deploy', 'preview']`)       |
| `dirs`    | `ResolvedDirs` | Resolved directory names for file-backed stores (auth, config) |

`dirs` contains `local` (resolved relative to the project root) and `global` (resolved relative to `~`). Both default to `.<cli-name>`.

## `ctx.auth`

Auth context decorated by the `auth()` middleware from `maltty/auth`. Only present when the auth middleware is registered.

| Property          | Type                                     | Description                                     |
| ----------------- | ---------------------------------------- | ----------------------------------------------- |
| `credential()`    | `AuthCredential \| null`                 | Passively resolved credential (file, env)       |
| `authenticated()` | `boolean`                                | Whether a passive credential exists             |
| `login(options?)` | `AsyncResult<AuthCredential, AuthError>` | Run interactive strategies, persist, and return |
| `logout()`        | `AsyncResult<string, AuthError>`         | Remove stored credential from disk              |

```ts
if (!ctx.auth.credential()) {
  ctx.fail('Not authenticated. Run `my-app login` first.')
}

const [error, credential] = await ctx.auth.login()
if (error) {
  ctx.fail(error.message)
}
```

See [Authentication](./authentication.md) for the full auth system reference.

## Module Augmentation

maltty exposes empty interfaces that consumers extend via TypeScript declaration merging. This adds project-wide type safety without threading generics through every handler.

For `ConfigRegistry`, use the `ConfigType` utility to derive the type from your Zod schema (see [`ctx.config`](#ctxconfig) above). Note that config augmentation targets `maltty/config`, while other interfaces target `maltty`:

```ts
declare module 'maltty' {
  interface MalttyArgs {
    verbose: boolean
  }

  interface MalttyStore {
    token: string
  }
}

// Config augmentation uses a separate module
declare module 'maltty/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

| Interface        | Module          | Affects             | Description                                                                                        |
| ---------------- | --------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `MalttyArgs`     | `maltty`        | `ctx.args`          | Global args merged into every command's args                                                       |
| `ConfigRegistry` | `maltty/config` | `ctx.config.load()` | Typed config returned by `load()` result                                                           |
| `MalttyStore`    | `maltty`        | `ctx.store`         | Global store keys merged into the store type                                                       |
| `StoreMap`       | `maltty`        | `ctx.store`         | The store's full key-value shape -- extend this to register typed keys (merges with `MalttyStore`) |

## Context in screen commands

Screen commands defined with `screen()` do not receive a `CommandContext` object. Instead, parsed args are passed directly as props to the React component, and runtime values are accessed via hooks:

| Hook          | Returns          | Context equivalent |
| ------------- | ---------------- | ------------------ |
| `useConfig()` | `ConfigHandle`   | `ctx.config`       |
| `useMeta()`   | `Readonly<Meta>` | `ctx.meta`         |
| `useStore()`  | `Store`          | `ctx.store`        |

See [Screens](./screens.md) for details.

## References

- [Core Reference](../reference/maltty.md)
- [Lifecycle](./lifecycle.md)
- [Configuration](./configuration.md)
- [Authentication](./authentication.md)
