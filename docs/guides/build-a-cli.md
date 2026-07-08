# Build a CLI

Define commands, middleware, configuration, and use maltty's sub-exports to build a complete CLI tool.

## Prerequisites

- Node.js 24+
- Bun 1.3+ (required if compiling to standalone binaries)
- `maltty` installed (`pnpm add maltty`)

Declare runtime constraints in your CLI's `package.json` so consumers get clear errors on incompatible runtimes:

```json
{
  "engines": {
    "node": ">=24",
    "bun": ">=1.3"
  }
}
```

## Steps

### 1. Define a command

Commands accept a description, typed arguments via Zod, and a handler function.

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

### 2. Bootstrap the CLI

`cli()` registers commands, parses arguments, runs middleware, and invokes the matched handler.

```ts
import { cli } from 'maltty'

cli({
  name: 'my-app',
  version: '1.0.0',
  description: 'My CLI tool',
  commands: { deploy, migrate },
  middleware: [timing],
  help: { header: 'my-app - deploy and migrate with ease' },
})
```

### 3. Add middleware

Middleware wraps command execution with pre/post logic. It receives the context and a `next` function.

**Root middleware** runs for every command:

```ts
import { middleware } from 'maltty'

const timing = middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.log.info(`Completed in ${Date.now() - start}ms`)
})

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [timing],
  commands: { deploy },
})
```

**Command middleware** runs only for a specific command:

```ts
const requireAuth = middleware(async (ctx, next) => {
  if (!process.env['API_TOKEN']) {
    ctx.fail('Missing API_TOKEN')
  }
  await next()
})

const deploy = command({
  description: 'Deploy the application',
  middleware: [requireAuth],
  async handler(ctx) {
    ctx.log.raw('Deploying')
  },
})
```

Root middleware wraps command middleware, which wraps the handler. See [Lifecycle](../concepts/lifecycle.md) for the full execution model.

### 4. Hide or deprecate commands

Commands support `hidden` and `deprecated` fields for controlling help output visibility. Both accept a static value or a function (`Resolvable<T>`), resolved once at registration time.

```ts
// Hidden from --help but still callable
const debug = command({
  description: 'Internal debugging tools',
  hidden: true,
  handler: async (ctx) => {
    /* ... */
  },
})

// Conditionally hidden based on environment
const experimental = command({
  description: 'Experimental feature',
  hidden: () => process.env['NODE_ENV'] === 'production',
  handler: async (ctx) => {
    /* ... */
  },
})

// Deprecated command with message
const legacyDeploy = command({
  description: 'Deploy (legacy)',
  deprecated: 'Use "deploy-v2" instead',
  handler: async (ctx) => {
    /* ... */
  },
})
```

Individual flags also support `hidden`, `deprecated`, and `group` for organizing help output:

```ts
const build = command({
  description: 'Build the project',
  options: {
    trace: { type: 'boolean', description: 'Enable tracing', hidden: true },
    output: { type: 'string', description: 'Output dir', group: 'Build Options:' },
    legacy: { type: 'boolean', description: 'Legacy mode', deprecated: 'Use --modern' },
  },
  handler: async (ctx) => {
    /* ... */
  },
})
```

### 5. Add subcommands

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

### 6. Autoload commands from a directory

Dynamically discover commands at runtime:

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

### 7. Add typed config

Scaffold config setup with the CLI, or create the files manually.

**Scaffold with the CLI:**

```bash
maltty add config
```

This creates `src/config.ts` with a Zod schema and `ConfigType` module augmentation. You can also include config setup when creating a new project:

```bash
maltty init --config
```

**Manual setup:**

Create a config schema file with `ConfigType` to derive `ConfigRegistry` from your Zod schema:

```ts
// src/config.ts
import type { ConfigType } from 'maltty/config'
import { z } from 'zod'

export const configSchema = z.object({
  apiUrl: z.string().url(),
  region: z.string().default('us-east-1'),
})

declare module 'maltty/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

Register the config middleware in `cli()`:

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

Commands load config lazily via the `ctx.config` handle:

```ts
export default command({
  async handler(ctx) {
    const [error, result] = await ctx.config.load()
    if (error) {
      ctx.fail(error.message)
      return
    }
    result.config.apiUrl // string
    result.config.region // string
  },
})
```

To load config eagerly (during middleware pass), use `eager: true`:

```ts
config({ schema: configSchema, eager: true })
```

**Standalone config client:**

For loading config outside the `cli()` bootstrap, use `createConfigClient`:

```ts
import { createConfigClient } from 'maltty/config'

const config = createConfigClient({ name: 'my-app', schema: MySchema })
const [error, result] = await config.load()
```

### 8. Use sub-exports

maltty exposes focused utilities through sub-exports.

**Log** -- structured terminal output is available on every context:

```ts
// In any command handler or middleware:
ctx.log.intro('My CLI')
ctx.log.info('Processing...')
ctx.log.success('Complete')
ctx.log.outro('Done')
```

**Store** -- file-backed JSON store for persistent data (separate from the in-memory `ctx.store` used for middleware-to-handler data flow):

```ts
import { createStore } from 'maltty/store'

const store = createStore({ dirName: '.my-app' })
const settings = store.load('settings.json')
```

**Project** -- git root resolution, submodule detection, path utilities:

```ts
import { findProjectRoot, isInSubmodule, resolvePath } from 'maltty/project'

const root = findProjectRoot()
const inSubmodule = isInSubmodule()
const appDir = resolvePath({ dirName: '.my-app' })
```

`findProjectRoot` returns `ProjectRoot | null` (with `path` and `isSubmodule` properties). `resolvePath` accepts `{ dirName, source?, startDir? }` and resolves to a local or global directory path.

### 9. Define a screen command

For interactive terminal UIs, use `screen()` instead of `command()`. Screen commands render a React component using Ink.

```tsx
import { Box, screen, Text, useApp } from 'maltty/ui'
import React from 'react'
import { z } from 'zod'

function Greeting({ name }: { readonly name: string }): React.ReactElement {
  const { exit } = useApp()

  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 2000)
    return () => {
      clearTimeout(timer)
    }
  }, [exit])

  return (
    <Box padding={1}>
      <Text color="green" bold>
        Hello, {name}!
      </Text>
    </Box>
  )
}

export default screen({
  description: 'Greet with a styled UI',
  options: z.object({
    name: z.string().describe('Name to greet'),
  }),
  render: Greeting,
})
```

Screen commands use `.tsx` files and access runtime context via hooks (`useConfig()`, `useMeta()`, `useStore()`) instead of the `ctx` object. See [Screens](../concepts/screens.md) for the full guide.

## Verification

```bash
npx my-app --help
npx my-app deploy --env staging --dry-run
```

## Troubleshooting

### Autoload finds no commands

**Issue:** `autoload()` returns an empty command tree.

**Fix:** Ensure the `dir` path is relative to the compiled entrypoint, not the source file. Check that each file in the directory exports a `command()` as its default export.

### Config file not found

**Issue:** `config.load()` returns a parse error.

**Fix:** Confirm the config file is named `maltty.config.ts` (or `.js`, `.json`, `.yaml`) and is in the project root.

## Resources

- [yargs](https://yargs.js.org)
- [Zod](https://zod.dev)
- [@clack/prompts](https://www.clack.cc)

## References

- [Core Reference](../reference/maltty.md)
- [Screens](../concepts/screens.md)
