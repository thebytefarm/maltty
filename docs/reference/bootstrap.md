# cli()

Bootstrap and run a CLI application. Registers commands, parses arguments, loads config, runs middleware, and invokes the matched handler.

Import from `@maltty/core`.

```ts
import { cli } from '@maltty/core'

cli({
  name: 'my-app',
  version: '1.0.0',
  description: 'My CLI tool',
  commands: { deploy, migrate },
  middleware: [timing],
  help: {
    header: 'my-app - deploy and migrate with ease',
    footer: 'Docs: https://my-app.dev',
  },
  dirs: { local: '.my-app', global: '.my-app' },
})
```

## CliOptions

| Field         | Type                                                            | Default | Description                                   |
| ------------- | --------------------------------------------------------------- | ------- | --------------------------------------------- |
| `name`        | `string`                                                        | --      | CLI name (used for help and config discovery) |
| `version`     | `string`                                                        | --      | CLI version                                   |
| `description` | `string`                                                        | --      | Human-readable description                    |
| `commands`    | `string \| CommandMap \| Promise<CommandMap> \| CommandsConfig` | --      | Commands source                               |
| `middleware`  | `Middleware[]`                                                  | --      | Root middleware stack                         |
| `help`        | `CliHelpOptions`                                                | --      | Custom help header/footer                     |
| `dirs`        | `DirsConfig`                                                    | --      | Directory name overrides                      |
| `log`         | `Log`                                                           | --      | Custom log implementation                     |
| `prompts`     | `Prompts`                                                       | --      | Custom prompts implementation                 |
| `spinner`     | `Spinner`                                                       | --      | Custom spinner implementation                 |

## CliHelpOptions

| Field    | Type     | Description                                                                            |
| -------- | -------- | -------------------------------------------------------------------------------------- |
| `header` | `string` | Text displayed above help output when the CLI is invoked without a command             |
| `footer` | `string` | Text displayed below help output on all help screens (e.g., docs URL, bug report link) |

## DirsConfig

Overrides directory names for file-backed stores (auth credentials, config). Both default to `.<name>` when omitted.

| Field    | Type     | Default   | Description                                                            |
| -------- | -------- | --------- | ---------------------------------------------------------------------- |
| `local`  | `string` | `.<name>` | Directory name for project-local resolution (`<project-root>/<local>`) |
| `global` | `string` | `.<name>` | Directory name for global resolution (`~/<global>`)                    |

## Commands option

The `commands` field accepts several forms:

| Form                  | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `CommandMap`          | Static object mapping command names to command definitions         |
| `Promise<CommandMap>` | Async-resolved command map                                         |
| `string`              | Directory path -- triggers autoloading from that directory         |
| `CommandsConfig`      | Structured config with optional `order` array for display ordering |
| _(omitted)_           | Loads `maltty.config.ts` and autoloads from its `commands` field   |

## defineConfig()

Helper for defining a `maltty.config.ts` file with type checking:

```ts
import { defineConfig } from '@maltty/core'

export default defineConfig({
  build: { out: 'dist' },
})
```

## Module augmentation

Extend maltty's interfaces via TypeScript declaration merging for project-wide type safety:

```ts
import type { ConfigType } from '@maltty/core/config'
import { z } from 'zod'

export const configSchema = z.object({
  apiUrl: z.string().url(),
  org: z.string().min(1),
})

declare module '@maltty/core' {
  interface MalttyArgs {
    verbose: boolean
  }
  interface MalttyStore {
    token: string
  }
}

declare module '@maltty/core/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

| Interface        | Module                | Affects             | Description                                                                                   |
| ---------------- | --------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| `MalttyArgs`     | `@maltty/core`        | `ctx.args`          | Global args merged into every command's args                                                  |
| `ConfigRegistry` | `@maltty/core/config` | `ctx.config.load()` | Typed config returned by `load()` result                                                      |
| `MalttyStore`    | `@maltty/core`        | `ctx.store`         | Global store keys merged into the store type                                                  |
| `StoreMap`       | `@maltty/core`        | `ctx.store`         | The store's full key-value shape -- extend to register typed keys (merges with `MalttyStore`) |

## Sub-exports

| Export                 | Purpose                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@maltty/core/config`  | Config loading and validation (`createConfigClient`)                                                                                                  |
| `@maltty/core/store`   | File-backed JSON store (`createStore`)                                                                                                                |
| `@maltty/core/project` | Git root resolution, path utilities (`findProjectRoot`, `isInSubmodule`, `getParentRepoRoot`, `resolvePath`, `resolveLocalPath`, `resolveGlobalPath`) |
| `@maltty/core/format`  | Standalone format functions (`formatCheck`, `formatFinding`, `formatCodeFrame`, `formatTally`, `formatDuration`)                                      |
| `@maltty/core/auth`    | Auth middleware, credential types, strategies (`auth`)                                                                                                |
| `@maltty/core/http`    | Typed HTTP client middleware (`http`, `createHttpClient`)                                                                                             |
| `@maltty/core/icons`   | Icon detection and font middleware (`icons`)                                                                                                          |
| `@maltty/core/report`  | Structured reporting middleware (`report`, `createReport`)                                                                                            |
| `@maltty/core/test`    | Test utilities (`createTestContext`, `runCommand`, `runMiddleware`, `runHandler`)                                                                     |
| `@maltty/core/ui`      | Screen commands and UI components (`screen`, `Box`, `Text`, `Select`, `useConfig`, `useMeta`, `useStore`)                                             |

## References

- [command()](./command.md)
- [middleware()](./middleware.md)
- [screen()](./screen.md)
- [Configuration](../concepts/configuration.md)
- [Lifecycle](../concepts/lifecycle.md)
