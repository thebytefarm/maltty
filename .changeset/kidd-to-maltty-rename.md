---
'maltty': minor
'@maltty/cli': minor
'@maltty/config': minor
'@maltty/utils': minor
'@maltty/bundler': minor
---

Renamed from `@kidd-cli/*` to `@maltty/*`, and the framework runtime is now published as the unscoped `maltty` package (was `@maltty/core`).

This is a breaking change for any consumer importing from `@kidd-cli/*` or `@maltty/core`. The old packages will be archived and deprecated on npm with a pointer to the new names.

**Migration is a find-and-replace:**

| Old                 | New               |
| ------------------- | ----------------- |
| `@kidd-cli/core`    | `maltty`          |
| `@maltty/core`      | `maltty`          |
| `@kidd-cli/cli`     | `@maltty/cli`     |
| `@kidd-cli/config`  | `@maltty/config`  |
| `@kidd-cli/utils`   | `@maltty/utils`   |
| `@kidd-cli/bundler` | `@maltty/bundler` |

**`defineConfig` moved to the `maltty/config` subpath:**

```ts
// Before
import { defineConfig } from '@maltty/core'

// After
import { defineConfig } from 'maltty/config'
```

This mirrors the Vitest/Hono convention — config files import from a dedicated subpath, runtime code imports from the top-level. The `maltty/config` subpath now exports both `defineConfig` (build/load time) and the `config` middleware (runtime), so all config concerns live under one entry.

**Also renamed:**

- CLI binary: `kidd` → `maltty`
- Config files: `kidd.config.{ts,mts,json,yaml,toml}` → `maltty.config.{ts,mts,json,yaml,toml}`
- Env vars: `KIDD_*` → `MALTTY_*` (e.g. `KIDD_PUBLIC_*`, `KIDD_DEBUG`, `KIDD_VERSION`)
- Public API types: `Kidd*` → `Maltty*` (e.g. `KiddArgs` → `MalttyArgs`, `KiddStore` → `MalttyStore`, `KiddProvider` → `MalttyProvider`, `KiddContext` → `MalttyContext`, `KiddProviderProps` → `MalttyProviderProps`)
