# @maltty/config

Build-time configuration management for maltty CLIs. Provides Zod-validated schemas for `maltty.config.ts` and a config loader powered by c12.

## Installation

```bash
pnpm add @maltty/config
```

## Usage

### Define a config

Create a `maltty.config.ts` in your project root:

```ts
import { defineConfig } from '@maltty/config'

export default defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
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

### Load a config

```ts
import { loadConfig } from '@maltty/config/utils'

const [error, result] = await loadConfig()
if (error) {
  console.error(error.message)
} else {
  console.log(result.config)
}
```

## Config options

| Field      | Type                        | Default        | Description                |
| ---------- | --------------------------- | -------------- | -------------------------- |
| `entry`    | `string`                    | `'./index.ts'` | CLI entry point            |
| `commands` | `string`                    | `'./commands'` | Commands directory         |
| `build`    | `BuildOptions`              | --             | tsdown build options       |
| `compile`  | `boolean \| CompileOptions` | --             | Binary compilation options |
| `include`  | `string[]`                  | --             | Extra file globs to bundle |

## Subpath exports

| Export                 | Description                      |
| ---------------------- | -------------------------------- |
| `@maltty/config`       | `defineConfig` and types         |
| `@maltty/config/utils` | `loadConfig` and compile helpers |

## License

MIT -- [GitHub](https://github.com/thebytefarm/maltty)
