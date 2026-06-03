# @maltty/core

An opinionated CLI framework for Node.js built on yargs, Zod, and functional TypeScript patterns.

## Installation

```bash
pnpm add @maltty/core
```

## Usage

### Define a CLI

```ts
import { cli } from '@maltty/core'

await cli({
  name: 'my-tool',
  version: '1.0.0',
  description: 'A CLI built with maltty',
  commands: './commands',
})
```

### Define a command

```ts
import { command } from '@maltty/core'

export default command({
  description: 'Greet a user',
  options: {
    name: { type: 'string', description: 'Name to greet', demandOption: true },
  },
  handler: async (ctx) => {
    ctx.log.info(`Hello, ${ctx.args.name}!`)
  },
})
```

### Define middleware

```ts
import { middleware, decorateContext } from '@maltty/core'

const withUser = middleware<{ Variables: { user: User } }>(async (ctx, next) => {
  decorateContext(ctx, 'user', await fetchUser())
  await next()
})
```

### Configuration

Create a `maltty.config.ts` in your project root:

```ts
import { defineConfig } from '@maltty/core'

export default defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
})
```

## Subpath exports

| Export                 | Description                        |
| ---------------------- | ---------------------------------- |
| `@maltty/core`         | CLI bootstrap, command, middleware |
| `@maltty/core/report`  | Structured reporting middleware    |
| `@maltty/core/config`  | Runtime config access              |
| `@maltty/core/format`  | Terminal formatting utilities      |
| `@maltty/core/store`   | Key-value store                    |
| `@maltty/core/project` | Project detection helpers          |
| `@maltty/core/auth`    | Authentication middleware          |
| `@maltty/core/http`    | HTTP client middleware             |
| `@maltty/core/icons`   | Icon set middleware                |
| `@maltty/core/stories` | Stories viewer for component dev   |
| `@maltty/core/test`    | Test utilities for commands        |

## License

MIT -- [GitHub](https://github.com/thebytefarm/maltty)
