<div align="center">
  <img src="assets/banner.svg" alt="maltty" width="90%" />
  <p><strong>An opinionated CLI framework for Node.js. Convention over configuration, end-to-end type safety.</strong></p>

<a href="https://github.com/thebytefarm/maltty/actions/workflows/ci.yml"><img src="https://github.com/thebytefarm/maltty/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
<a href="https://www.npmjs.com/package/maltty"><img src="https://img.shields.io/npm/v/maltty" alt="npm version" /></a>
<a href="https://github.com/thebytefarm/maltty/blob/main/LICENSE"><img src="https://img.shields.io/github/license/thebytefarm/maltty" alt="License" /></a>

<a href="https://maltty.dev">📖 Documentation</a> &nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp; <a href="https://github.com/thebytefarm/maltty/issues">🐛 Issues</a>

</div>

## Features

- 🧰 **Batteries included** — Config, auth, prompts, logging, output, and middleware built in
- 📁 **File-system auto-loading** — Drop a file in `commands/`, get a command
- ⚡ **Build and compile** — Bundle your command tree or produce cross-platform standalone binaries
- 🚀 **Two files to a full CLI** — Define a schema, write a handler, done
- 🛠️ **Developer experience** — Scaffolding, hot reload, route inspection, and diagnostics out of the box

## Install

```bash
npm install maltty
```

## Usage

### Define your CLI

```ts
// index.ts
import { cli } from 'maltty'
import { z } from 'zod'

await cli({
  name: 'deploy',
  version: '0.1.0',
  config: {
    schema: z.object({
      registry: z.string().url(),
      region: z.enum(['us-east-1', 'eu-west-1']),
    }),
  },
})
```

### Add a command

```ts
// commands/deploy.ts
import { command } from 'maltty'
import { z } from 'zod'

export default command({
  description: 'Deploy to the configured registry',
  args: z.object({
    tag: z.string().describe('Image tag to deploy'),
    dry: z.boolean().default(false).describe('Dry run'),
  }),
  handler: async (ctx) => {
    ctx.log.info(`Deploying ${ctx.args.tag} to ${ctx.config.region}`)
  },
})
```

### Add a screen

```tsx
// commands/dashboard.tsx
import { screen, Box, Text, useScreenContext } from 'maltty/ui'
import { z } from 'zod'

function Dashboard({ env }: { env: string }) {
  const ctx = useScreenContext()
  return (
    <Box flexDirection="column">
      <Text bold>Dashboard — {env}</Text>
      <Text>Region: {ctx.config.region}</Text>
    </Box>
  )
}

export default screen({
  description: 'Launch an interactive dashboard',
  options: z.object({
    env: z.string().default('staging').describe('Target environment'),
  }),
  render: Dashboard,
})
```

### Run it

```bash
maltty dev -- deploy --tag v1.2.3         # dev mode
maltty build                              # bundle
maltty compile                            # standalone binary
```

## License

[MIT](LICENSE)
