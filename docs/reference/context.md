# Context

The central object threaded through every handler and middleware.

## Properties

| Property  | Type                                      | Description                                                 |
| --------- | ----------------------------------------- | ----------------------------------------------------------- |
| `args`    | `DeepReadonly<Merge<MalttyArgs, TArgs>>`  | Parsed and validated command args                           |
| `config`  | `DeepReadonly<Merge<CliConfig, TConfig>>` | Validated runtime config                                    |
| `log`     | `Log`                                     | Logging methods                                             |
| `prompts` | `Prompts`                                 | Interactive prompts                                         |
| `spinner` | `Spinner`                                 | Spinner for long-running operations                         |
| `colors`  | `Colors`                                  | Color formatting utilities (picocolors)                     |
| `format`  | `Format`                                  | Pure string formatters (json, table) -- no I/O              |
| `store`   | `Store`                                   | Typed in-memory key-value store                             |
| `fail`    | `(message, options?) => never`            | Throw a user-facing error                                   |
| `meta`    | `Meta`                                    | CLI metadata (name, version, command path)                  |
| `auth?`   | `AuthContext`                             | Auth credential and login (when auth middleware registered) |

## Log

| Method    | Signature                                    | Description                               |
| --------- | -------------------------------------------- | ----------------------------------------- |
| `error`   | `(message: string) => void`                  | Log an error                              |
| `info`    | `(message: string) => void`                  | Log an info message                       |
| `intro`   | `(title?: string) => void`                   | Log an intro banner                       |
| `message` | `(message: string, opts?) => void`           | Log a message with optional custom symbol |
| `newline` | `() => void`                                 | Print a blank line                        |
| `note`    | `(message?: string, title?: string) => void` | Log a boxed note                          |
| `outro`   | `(message?: string) => void`                 | Log an outro banner                       |
| `raw`     | `(text: string) => void`                     | Write raw text to output                  |
| `step`    | `(message: string) => void`                  | Log a step                                |
| `success` | `(message: string) => void`                  | Log a success message                     |
| `warn`    | `(message: string) => void`                  | Log a warning                             |

## ctx.fail()

Throws a `ContextError` with a clean user-facing message (no stack trace in production).

```ts
ctx.fail('Deployment failed', { code: 'DEPLOY_ERROR', exitCode: 2 })
```

| Option     | Type     | Default | Description                 |
| ---------- | -------- | ------- | --------------------------- |
| `code`     | `string` | --      | Machine-readable error code |
| `exitCode` | `number` | `1`     | Process exit code           |

## Store

In-memory key-value store for passing data between middleware and handlers.

| Method   | Signature                               | Description         |
| -------- | --------------------------------------- | ------------------- |
| `get`    | `(key: string) => unknown`              | Get a value by key  |
| `set`    | `(key: string, value: unknown) => void` | Set a value         |
| `has`    | `(key: string) => boolean`              | Check if key exists |
| `delete` | `(key: string) => boolean`              | Delete a key        |
| `clear`  | `() => void`                            | Clear all entries   |

## Meta

| Property  | Type                | Description            |
| --------- | ------------------- | ---------------------- |
| `name`    | `string`            | CLI name               |
| `version` | `string`            | CLI version            |
| `command` | `readonly string[]` | Current command path   |
| `dirs`    | `{ global, local }` | Config directory names |

## References

- [Context (concept)](../concepts/context.md)
- [command()](./command.md)
- [middleware()](./middleware.md)
- [cli()](./bootstrap.md)
