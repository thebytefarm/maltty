# command()

Define a command with typed options, positionals, and a handler function.

Import from `maltty`.

```ts
import { command } from 'maltty'
import { z } from 'zod'

const deploy = command({
  description: 'Deploy the application',
  options: z.object({
    env: z.enum(['staging', 'production']).describe('Target environment'),
    dryRun: z.boolean().default(false).describe('Preview without applying'),
  }),
  async handler(ctx) {
    ctx.log.info(`Deploying to ${ctx.args.env}`)
  },
})
```

## CommandDef

| Field         | Type                              | Default | Description                                                    |
| ------------- | --------------------------------- | ------- | -------------------------------------------------------------- |
| `description` | `Resolvable<string>`              | --      | Human-readable description (static or function)                |
| `options`     | `ArgsDef`                         | --      | Option (flag) definitions -- Zod schema or yargs-native format |
| `positionals` | `ArgsDef`                         | --      | Positional argument definitions                                |
| `handler`     | `(ctx: Context) => Promise<void>` | --      | Command handler function                                       |
| `middleware`  | `Middleware[]`                    | --      | Command-scoped middleware                                      |
| `commands`    | `CommandMap`                      | --      | Nested subcommands                                             |
| `hidden`      | `Resolvable<boolean>`             | --      | When true, hidden from help output                             |
| `deprecated`  | `Resolvable<string \| boolean>`   | --      | Marks the command as deprecated                                |
| `name`        | `string`                          | --      | Explicit command name (overrides autoload filename)            |
| `aliases`     | `readonly string[]`               | --      | Alternative names                                              |

## Yargs-native arg format

As an alternative to Zod, commands accept a yargs-native format for `options` and `positionals`. Both produce the same typed `ctx.args`.

```ts
const deploy = command({
  description: 'Deploy the application',
  options: {
    env: {
      type: 'string',
      description: 'Target environment',
      required: true,
      choices: ['staging', 'production'],
    },
    dryRun: { type: 'boolean', description: 'Preview without applying', default: false },
  },
  async handler(ctx) {
    ctx.log.info(`Deploying to ${ctx.args.env}`)
  },
})
```

### YargsArgDef

| Field         | Type                                           | Description                                           |
| ------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `type`        | `'string' \| 'number' \| 'boolean' \| 'array'` | Argument type                                         |
| `description` | `string`                                       | Help text                                             |
| `required`    | `boolean`                                      | Whether the arg is required                           |
| `default`     | `unknown`                                      | Default value                                         |
| `alias`       | `string \| string[]`                           | Short aliases                                         |
| `choices`     | `readonly string[]`                            | Allowed values                                        |
| `hidden`      | `Resolvable<boolean>`                          | Omit from `--help` output (flag still works)          |
| `deprecated`  | `Resolvable<string \| boolean>`                | Show deprecation notice in help and on use            |
| `group`       | `string`                                       | Group heading in help output (e.g. `'Auth Options:'`) |

## Hidden and deprecated

Both accept a static value or a function (`Resolvable<T>`), resolved once at registration time.

```ts
// Hidden from --help but still callable
const debug = command({
  description: 'Internal debugging tools',
  hidden: true,
  handler: async (ctx) => {
    /* ... */
  },
})

// Conditionally hidden
const experimental = command({
  description: 'Experimental feature',
  hidden: () => process.env['NODE_ENV'] === 'production',
  handler: async (ctx) => {
    /* ... */
  },
})

// Deprecated with message
const oldDeploy = command({
  description: 'Deploy (legacy)',
  deprecated: 'Use "deploy-v2" instead',
  handler: async (ctx) => {
    /* ... */
  },
})
```

## Subcommands

Commands can contain nested subcommands:

```ts
const generate = command({
  description: 'Code generation utilities',
  commands: {
    types: generateTypes,
    schema: generateSchema,
  },
})
```

## autoload()

Dynamically discover commands from a directory at runtime.

```ts
import { autoload } from 'maltty'

cli({
  name: 'my-app',
  version: '1.0.0',
  commands: {
    generate: autoload({ dir: './commands/generate' }),
  },
})
```

## References

- [middleware()](./middleware.md)
- [cli()](./bootstrap.md)
- [screen()](./screen.md)
- [Context](../concepts/context.md)
