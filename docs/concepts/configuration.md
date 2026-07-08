# Configuration

The configuration system for maltty CLIs. Supports multiple file formats, automatic discovery, Zod schema validation, and a typed config client API.

## Supported Formats

| Format | Extensions | Notes              |
| ------ | ---------- | ------------------ |
| JSONC  | `.jsonc`   | JSON with comments |
| JSON   | `.json`    | Standard JSON      |
| YAML   | `.yaml`    | YAML format        |

Config files are named `.<name>.jsonc`, `.<name>.json`, or `.<name>.yaml`, where `<name>` is the CLI name passed to `cli({ name })` or `createConfigClient({ name })`.

## `defineConfig()`

Type-safe helper for `maltty.config.ts`. Used by the `@maltty/cli` build system.

```ts
import { defineConfig } from 'maltty/config'

export default defineConfig({
  entry: './index.ts',
  commands: './commands',
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

## Config Middleware

Configuration is purely opt-in via the `config()` middleware from `maltty/config`. Register it in the middleware array to make `ctx.config` available in handlers.

### Lazy loading (default)

By default, config is loaded lazily -- nothing is read from disk until the handler calls `ctx.config.load()`:

```ts
import { cli } from 'maltty'
import { config } from 'maltty/config'
import { configSchema } from './config.js'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [config({ schema: configSchema })],
  commands: { deploy },
})
```

### Eager loading

Pass `eager: true` to load and validate config during the middleware pass, before the handler runs:

```ts
config({ schema: configSchema, eager: true })
```

### Middleware options

| Field    | Type      | Default             | Description                                                                                                      |
| -------- | --------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `schema` | `ZodType` | --                  | Zod schema to validate the loaded config. Infers `ctx.config` type.                                              |
| `eager`  | `boolean` | `false`             | Load config during middleware pass instead of on first `load()` call                                             |
| `layers` | `boolean` | `false`             | Enable layered resolution when eager loading. For lazy mode, pass `{ layers: true }` to `load()` instead.        |
| `dirs`   | `object`  | From `ctx.meta`     | Override layer directories: `{ global?: string, local?: string }`. Only applies when layered resolution is used. |
| `name`   | `string`  | Derived from `name` | Override the config file name for file discovery                                                                 |

## Using `ctx.config`

The middleware decorates `ctx.config` as a `ConfigHandle` with a `load()` method. It returns the load result or `null` on error:

```ts
export default command({
  async handler(ctx) {
    const result = await ctx.config.load()
    if (!result) return
    result.config.apiUrl // string
    result.config.org // string
  },
})
```

Pass `{ exitOnError: true }` to call `ctx.fail()` on error, guaranteeing a non-null return:

```ts
export default command({
  async handler(ctx) {
    const { config } = await ctx.config.load({ exitOnError: true })
    config.apiUrl // string — guaranteed
  },
})
```

### Loading with layers

Pass `{ layers: true }` to `load()` to include layer metadata in the result:

```ts
const result = await ctx.config.load({ layers: true, exitOnError: true })
result.config.apiUrl // string
result.layers // ConfigLayer[]
```

## Typing `ctx.config`

The Zod schema validates config at runtime, but TypeScript cannot automatically propagate the schema type to `ctx.config` in command handlers (commands are defined in separate files and dynamically imported). Use `ConfigType` with module augmentation on `maltty/config` to get compile-time safety:

```ts
// src/config.ts
import type { ConfigType } from 'maltty/config'
import { z } from 'zod'

export const configSchema = z.object({
  apiUrl: z.string().url(),
  org: z.string().min(1),
})

declare module 'maltty/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

This keeps the schema as the single source of truth -- `ConfigRegistry` is always derived from it, so they can never drift apart. Every command handler now sees typed properties on the `result.config` object returned by `ctx.config.load()`.

You can scaffold this setup automatically:

- **New projects:** `maltty init --config`
- **Existing projects:** `maltty add config`

## Config Client

The `createConfigClient` factory (from `maltty/config`) provides a standalone API for loading, finding, and writing config files outside of the `cli()` bootstrap.

```ts
import { createConfigClient } from 'maltty/config'

const config = createConfigClient({
  name: 'my-app',
  schema: MySchema,
  searchPaths: ['./config'],
})
```

### `ConfigOptions`

| Field         | Type       | Description                                                    |
| ------------- | ---------- | -------------------------------------------------------------- |
| `name`        | `string`   | Config file name (e.g. `'my-app'` resolves to `.my-app.jsonc`) |
| `schema`      | `ZodType`  | Zod schema for validation                                      |
| `searchPaths` | `string[]` | Additional directories to search                               |

### `config.find(cwd?)`

Find the config file path without loading it.

```ts
const filePath = await config.find()
```

Returns `string | null`.

### `config.load(cwd?)`

Load and validate a config file. Returns a Result tuple.

```ts
const result = await config.load()
```

| Return value                           | Meaning                           |
| -------------------------------------- | --------------------------------- |
| `[error, null]`                        | Load or validation failed         |
| `[null, { config, filePath, format }]` | Successfully loaded and validated |
| `[null, null]`                         | No config file found              |

### `config.write(data, options?)`

Validate and write config data to a file.

```ts
const [error, result] = await config.write(
  { apiUrl: 'https://api.example.com' },
  { format: 'jsonc' }
)
```

| Option     | Type           | Description                                   |
| ---------- | -------------- | --------------------------------------------- |
| `dir`      | `string`       | Target directory (defaults to cwd)            |
| `format`   | `ConfigFormat` | Output format (`'jsonc'`, `'json'`, `'yaml'`) |
| `filePath` | `string`       | Explicit output path (overrides `dir`)        |

## Discovery Order

When `config.load()` or `config.find()` is called, files are searched in this order:

1. Custom `searchPaths` (if provided)
2. Current working directory
3. Git repository root

The first matching file wins. Files are checked in extension order: `.jsonc`, `.json`, `.yaml`.

## Config File Examples

Below are examples of what the config files look like in each supported format.

### JSONC

```jsonc
// .my-app.jsonc
{
  // API endpoint for the service
  "apiUrl": "https://api.example.com",
  "org": "my-org",
  "region": "us-east-1",
}
```

### JSON

```json
{
  "apiUrl": "https://api.example.com",
  "org": "my-org",
  "region": "us-east-1"
}
```

### YAML

```yaml
# .my-app.yaml
apiUrl: https://api.example.com
org: my-org
region: us-east-1
```

## Common Patterns

### Optional config

When config is optional (not every project has a config file), handle the `[null, null]` return from `config.load()`:

```ts
const config = createConfigClient({ name: 'my-app', schema: MySchema })
const [error, result] = await config.load()

if (error) {
  console.error('Invalid config:', error.message)
  process.exit(1)
}

// result is null when no config file found -- use defaults
const settings = result ? result.config : { apiUrl: 'https://localhost:3000' }
```

### Writing config from a setup command

Use `config.write()` to create a config file from user input:

```ts
const setupCommand = command({
  description: 'Configure the CLI',
  async handler(ctx) {
    const apiUrl = await ctx.prompts.text({ message: 'API URL' })
    const org = await ctx.prompts.text({ message: 'Organization' })

    const config = createConfigClient({ name: 'my-app', schema: configSchema })
    const [error] = await config.write({ apiUrl, org }, { format: 'jsonc' })

    if (error) {
      ctx.fail(`Failed to write config: ${error.message}`)
    }

    ctx.logger.success('Config saved')
  },
})
```

### Environment-specific config

Use different config file names for different environments:

```ts
import { config } from 'maltty/config'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    config({
      schema: configSchema,
      name: process.env['NODE_ENV'] === 'production' ? 'my-app-prod' : 'my-app',
    }),
  ],
  commands: { deploy },
})
```

## Troubleshooting

### Config validation fails

**Issue:** `config.load()` returns a validation error.

**Fix:** The Zod schema must match the shape of your config file. Use `z.object({}).passthrough()` during migration if you need to accept unknown keys temporarily. Check for typos in field names and ensure types match (e.g., a number field should not contain a string in the config file).

### Config file not discovered

**Issue:** `config.load()` returns `[null, null]` even though a config file exists.

**Fix:** Verify the file is named `.<cli-name>.<ext>` (note the leading dot). The `<cli-name>` must match the `name` passed to `createConfigClient()` or `cli()`. Supported extensions: `.jsonc`, `.json`, `.yaml`.

### YAML parsing error

**Issue:** YAML config fails to load with a parse error.

**Fix:** YAML is sensitive to indentation. Ensure consistent use of spaces (not tabs). Verify the file is valid YAML using an online validator.

## References

- [Core Reference](../reference/maltty.md)
- [Context](./context.md)
- [@maltty/cli Reference](../reference/cli.md)
