---
'maltty': major
'@maltty/cli': minor
'@maltty/config': minor
'@maltty/utils': minor
'@maltty/bundler': minor
---

End-to-end rename. The framework was previously published under `@kidd-cli/*`, then briefly under `@maltty/*`, and is now consolidated as **`maltty`** (the runtime you import) plus a few scoped support packages. The CLI binary, config file convention, env var prefix, and several public types were renamed to match.

Old packages (`@kidd-cli/*`, `@maltty/core`) will be deprecated on npm with a pointer to the new names.

## Package renames

| Old                 | New               | Role                   |
| ------------------- | ----------------- | ---------------------- |
| `@kidd-cli/core`    | `maltty`          | Framework runtime      |
| `@maltty/core`      | `maltty`          | Framework runtime      |
| `@kidd-cli/cli`     | `@maltty/cli`     | DX tool (`maltty` bin) |
| `@kidd-cli/config`  | `@maltty/config`  | Build-time config      |
| `@kidd-cli/utils`   | `@maltty/utils`   | Shared utilities       |
| `@kidd-cli/bundler` | `@maltty/bundler` | Bundler plugin         |

```diff
- import { command, cli } from '@maltty/core'
+ import { command, cli } from 'maltty'

- import { auth } from '@maltty/core/auth'
+ import { auth } from 'maltty/auth'
```

## `defineConfig` moved to `maltty/config`

Config files import from a dedicated subpath; runtime code imports from the top-level. Mirrors the Vitest/Hono pattern. The `maltty/config` subpath exports both `defineConfig` (build/load time) and the `config` middleware (runtime), so all config concerns live under one entry.

```diff
// maltty.config.ts
- import { defineConfig } from '@maltty/core'
+ import { defineConfig } from 'maltty/config'

export default defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
})
```

```diff
// src/commands/foo.ts — runtime imports unchanged
  import { command } from 'maltty'
  import { config } from 'maltty/config'  // ← middleware lives here too
```

## CLI binary

```diff
- "scripts": { "dev": "kidd dev", "build": "kidd build" }
+ "scripts": { "dev": "maltty dev", "build": "maltty build" }
```

## Config file names

`kidd.config.{ts,mts,json,yaml,toml}` → `maltty.config.{ts,mts,json,yaml,toml}`. Rename the file; the contents only need the `defineConfig` import updated (see above).

## Env vars

| Old             | New               |
| --------------- | ----------------- |
| `KIDD_PUBLIC_*` | `MALTTY_PUBLIC_*` |
| `KIDD_DEBUG`    | `MALTTY_DEBUG`    |
| `KIDD_VERSION`  | `MALTTY_VERSION`  |

## Public API types

`Kidd*` → `Maltty*`:

| Old                 | New                   |
| ------------------- | --------------------- |
| `KiddArgs`          | `MalttyArgs`          |
| `KiddStore`         | `MalttyStore`         |
| `KiddProvider`      | `MalttyProvider`      |
| `KiddProviderProps` | `MalttyProviderProps` |
| `KiddContext`       | `MalttyContext`       |
