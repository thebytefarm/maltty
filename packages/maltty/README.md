# maltty

An opinionated CLI framework for Node.js built on yargs, Zod, and functional TypeScript patterns.

## Installation

```bash
pnpm add maltty
```

## Usage

### Define a CLI

```ts
import { cli } from 'maltty'

await cli({
  name: 'my-tool',
  version: '1.0.0',
  description: 'A CLI built with maltty',
  commands: './commands',
})
```

### Define a command

```ts
import { command } from 'maltty'

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
import { middleware, decorateContext } from 'maltty'

const withUser = middleware<{ Variables: { user: User } }>(async (ctx, next) => {
  decorateContext(ctx, 'user', await fetchUser())
  await next()
})
```

### Configuration

Create a `maltty.config.ts` in your project root:

```ts
import { defineConfig } from 'maltty/config'

export default defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
})
```

## Subpath exports

| Export           | Description                        |
| ---------------- | ---------------------------------- |
| `maltty`         | CLI bootstrap, command, middleware |
| `maltty/report`  | Structured reporting middleware    |
| `maltty/config`  | Runtime config access              |
| `maltty/format`  | Terminal formatting utilities      |
| `maltty/store`   | Key-value store                    |
| `maltty/project` | Project detection helpers          |
| `maltty/auth`    | Authentication middleware          |
| `maltty/http`    | HTTP client middleware             |
| `maltty/icons`   | Icon set middleware                |
| `maltty/stories` | Stories viewer for component dev   |
| `maltty/test`    | Test utilities for commands        |

## License

MIT -- [GitHub](https://github.com/thebytefarm/maltty)
