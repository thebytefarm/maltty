# CLI

Developer CLI for maltty projects. Scaffolding, building, diagnostics, and code generation.

## Installation

```bash
pnpm add -D @maltty/cli
```

## Commands

### `maltty init`

Scaffold a new maltty CLI project. Prompts for project details interactively or accepts them as flags.

```bash
maltty init
maltty init --name my-cli --pm pnpm --example
```

| Flag            | Type                        | Description                      |
| --------------- | --------------------------- | -------------------------------- |
| `--name`        | `string`                    | Project name (kebab-case)        |
| `--description` | `string`                    | Project description              |
| `--pm`          | `'pnpm' \| 'yarn' \| 'npm'` | Package manager                  |
| `--example`     | `boolean`                   | Include an example hello command |

### `maltty build`

Bundle a maltty CLI project for production using tsdown. Optionally compile to standalone binaries via Bun.

```bash
maltty build
maltty build --compile
maltty build --targets darwin-arm64 linux-x64
```

| Flag        | Type       | Description                                     |
| ----------- | ---------- | ----------------------------------------------- |
| `--compile` | `boolean`  | Compile to standalone binaries after bundling   |
| `--targets` | `string[]` | Cross-compilation targets (implies `--compile`) |

Supported compile targets: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `linux-x64-musl`, `windows-x64`, `windows-arm64`.

Build options can also be configured in `maltty.config.ts`:

```ts
import { defineConfig } from '@maltty/core'

export default defineConfig({
  entry: './index.ts',
  build: {
    out: './dist',
    target: 'node18',
    minify: false,
    sourcemap: true,
  },
  compile: {
    targets: ['darwin-arm64', 'linux-x64'],
    name: 'my-cli',
  },
})
```

### `maltty dev`

Start a maltty CLI project in development mode. Loads the project's `maltty.config.ts`, starts tsdown in watch mode, and logs rebuild status on each file change.

```bash
maltty dev
```

On the first successful build the spinner stops and a "watching" message is logged. Subsequent rebuilds log a success message. Build options are read from `maltty.config.ts` (all fields are optional — defaults apply when no config file is found).

### `maltty doctor`

Diagnose common project issues. Validates config, checks `package.json` setup, verifies entry points, and catches anything that could cause build or runtime failures.

```bash
maltty doctor
maltty doctor --fix
```

| Flag    | Type      | Description                    |
| ------- | --------- | ------------------------------ |
| `--fix` | `boolean` | Auto-fix issues where possible |

### `maltty add command`

Add a new command to an existing maltty project. Detects the project root and generates a command file in the configured commands directory.

```bash
maltty add command
maltty add command --name deploy --description "Deploy the app" --args
```

| Flag            | Type      | Description               |
| --------------- | --------- | ------------------------- |
| `--name`        | `string`  | Command name (kebab-case) |
| `--description` | `string`  | Command description       |
| `--args`        | `boolean` | Include a Zod args schema |

### `maltty add middleware`

Add a new middleware to an existing maltty project. Generates a middleware file in `src/middleware/`.

```bash
maltty add middleware
maltty add middleware --name auth --description "Require authentication"
```

| Flag            | Type     | Description                  |
| --------------- | -------- | ---------------------------- |
| `--name`        | `string` | Middleware name (kebab-case) |
| `--description` | `string` | Middleware description       |

### `maltty add config`

Scaffold a config schema with Zod validation and `ConfigType` module augmentation in an existing maltty project. Creates `src/config.ts` with a starter schema and wires up the `declare module` augmentation.

```bash
maltty add config
```

This generates:

```ts
// src/config.ts
import type { ConfigType } from '@maltty/core'
import { z } from 'zod'

export const configSchema = z.object({
  // Add your config fields here
})

declare module '@maltty/core' {
  interface CliConfig extends ConfigType<typeof configSchema> {}
}
```

### `maltty commands`

Display the command tree for a maltty CLI project. Scans the configured commands directory and prints an ASCII tree of all discovered commands and subcommands.

```bash
maltty commands
```

### `maltty stories`

Launch the stories viewer TUI. Discovers `.stories.tsx` / `.stories.ts` files in the project and renders a browsable tree with live preview and an interactive props editor.

```bash
maltty stories
maltty stories --include "src/components/**/*.stories.tsx"
```

| Flag        | Type     | Description                        |
| ----------- | -------- | ---------------------------------- |
| `--include` | `string` | Glob pattern to filter story files |

The viewer watches for file changes and hot-reloads stories automatically. Press `?` inside the viewer to see keyboard shortcuts.

## Workflows

### New project from scratch

```bash
maltty init --name my-cli --pm pnpm --example
cd my-cli
pnpm install
maltty dev
```

### Add features to an existing project

```bash
maltty add command --name deploy --description "Deploy the app" --args
maltty add middleware --name require-auth --description "Require authentication"
maltty add config
```

### Production build

```bash
maltty build
maltty build --compile --targets darwin-arm64 linux-x64
```

### Diagnose issues

```bash
maltty doctor
maltty doctor --fix
maltty commands
```

### Develop components

```bash
maltty stories
maltty stories --include "src/ui/**/*.stories.tsx"
```

## References

- [Core](./maltty.md)
- [Build a CLI](../guides/build-a-cli.md)
- [Configuration](../concepts/configuration.md)
