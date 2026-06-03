# @maltty/cli

DX companion CLI for the maltty framework. Provides scaffolding, build tooling, a dev server, and diagnostics for maltty-based CLI projects.

## Installation

```bash
pnpm add -D @maltty/cli
```

This package installs the `maltty` binary.

## Commands

### `maltty init`

Scaffold a new maltty CLI project with a recommended directory structure, config file, and starter command.

```bash
maltty init
```

### `maltty build`

Bundle your CLI using tsdown. Reads `maltty.config.ts` for entry point, output directory, and compile targets.

```bash
maltty build
maltty build --compile    # produce standalone binaries
```

### `maltty dev`

Start a dev server that watches for changes and rebuilds automatically.

```bash
maltty dev
```

### `maltty commands`

List all registered commands in the project.

```bash
maltty commands
```

### `maltty doctor`

Run diagnostics to verify your project setup, dependencies, and configuration.

```bash
maltty doctor
```

### `maltty stories`

Launch the stories viewer TUI for browsing and previewing component stories in the terminal. Discovers `.stories.tsx` files in the project and renders them with an interactive props editor.

```bash
maltty stories
maltty stories --include "src/components/**/*.stories.tsx"
```

## Configuration

The CLI reads from `maltty.config.ts` in your project root:

```ts
import { defineConfig } from '@maltty/core'

export default defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
  build: {
    out: './dist',
    target: 'node18',
    minify: false,
  },
  compile: {
    targets: ['darwin-arm64', 'linux-x64'],
  },
})
```

## License

MIT -- [GitHub](https://github.com/thebytefarm/maltty)
