# Quick Start

Get a working CLI in under 5 minutes.

## Install

```bash
pnpm add @maltty/core zod
```

## Create a command

```ts
// src/commands/greet.ts
import { command } from '@maltty/core'
import { z } from 'zod'

export default command({
  description: 'Say hello',
  options: z.object({
    name: z.string().describe('Who to greet'),
  }),
  async handler(ctx) {
    ctx.logger.success(`Hello, ${ctx.args.name}!`)
  },
})
```

## Bootstrap the CLI

```ts
// src/index.ts
import { cli } from '@maltty/core'
import greet from './commands/greet.js'

cli({
  name: 'my-app',
  version: '0.1.0',
  commands: { greet },
})
```

## Run it

```bash
npx tsx src/index.ts greet --name world
```

## Add middleware

Middleware wraps every command in an onion model -- each middleware can run logic before and after the handler. Here is a simple timing middleware:

```ts
// src/middleware/timing.ts
import { middleware } from '@maltty/core'

export const timing = middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.logger.info(`Completed in ${Date.now() - start}ms`)
})
```

Update the bootstrap to register it:

```ts
// src/index.ts
import { cli } from '@maltty/core'
import greet from './commands/greet.js'
import { timing } from './middleware/timing.js'

cli({
  name: 'my-app',
  version: '0.1.0',
  middleware: [timing],
  commands: { greet },
})
```

Every command now logs its execution time automatically.

## Add configuration

maltty discovers and validates configuration files using Zod. Define a config schema and use module augmentation to type the config handle:

```ts
// src/config.ts
import type { ConfigType } from '@maltty/core/config'
import { z } from 'zod'

export const configSchema = z.object({
  greeting: z.string().default('Hello'),
})

declare module '@maltty/core/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

Register the `config()` middleware in `cli()`:

```ts
// src/index.ts
import { cli } from '@maltty/core'
import { config } from '@maltty/core/config'
import greet from './commands/greet.js'
import { timing } from './middleware/timing.js'
import { configSchema } from './config.js'

cli({
  name: 'my-app',
  version: '0.1.0',
  middleware: [config({ schema: configSchema }), timing],
  commands: { greet },
})
```

Now update the command to load config lazily via the handle:

```ts
// src/commands/greet.ts
import { command } from '@maltty/core'
import { z } from 'zod'

export default command({
  description: 'Say hello',
  options: z.object({
    name: z.string().describe('Who to greet'),
  }),
  async handler(ctx) {
    const [error, result] = await ctx.config.load()
    if (error) {
      ctx.fail(error.message)
      return
    }
    ctx.logger.success(`${result.config.greeting}, ${ctx.args.name}!`)
  },
})
```

maltty will look for `.my-app.jsonc`, `.my-app.json`, and `.my-app.yaml` -- all validated against your Zod schema when `load()` is called.

## Build for production

Install the maltty CLI tooling as a dev dependency and run the build command:

```bash
pnpm add -D @maltty/cli
maltty build
```

This produces an ESM bundle ready for distribution. See the [Build a CLI](/guides/build-a-cli) guide for standalone binary output and advanced build options.

## Next steps

- [Build a CLI](/guides/build-a-cli) -- middleware, config, autoloading, and sub-exports
- [Lifecycle](/concepts/lifecycle) -- how commands, middleware, and context fit together
- [Add Authentication](/guides/add-authentication) -- auth middleware and token storage
