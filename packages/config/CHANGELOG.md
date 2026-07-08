# @maltty/config

## 1.0.0-rc.0

### Major Changes

- cac7f40: End-to-end rename. The framework was previously published under `@kidd-cli/*`, then briefly under `@maltty/*`, and is now consolidated as **`maltty`** (the runtime you import) plus a few scoped support packages. The CLI binary, config file convention, env var prefix, and several public types were renamed to match.

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

### Patch Changes

- d211468: Upgrade dependencies to their latest versions — runtime deps (ink, react, c12, @clack/prompts, type-fest, fs-extra) and dev tooling (oxlint, oxfmt, vitest, tsdown, typescript, @types/node).
- Updated dependencies [cac7f40]
- Updated dependencies [d211468]
  - @maltty/utils@1.0.0-rc.0

## 0.4.1

### Patch Changes

- Updated dependencies [f8290a2]
  - @maltty/utils@0.4.2

## 0.4.0

### Minor Changes

- 55071fa: Disable Bun's automatic `.env` and `bunfig.toml` loading in compiled binaries by default. Adds `autoloadDotenv` option to compile config for opt-in `.env` loading. `bunfig.toml` loading is always disabled.

## 0.3.1

### Patch Changes

- 1aee09e: fix(cli): bundle @maltty/\* deps so published CLI is self-contained

  The published CLI had bare imports to workspace packages whose npm exports maps
  were stale (renamed subpaths like `./loader` → `./utils`, `./fs` → `./node`).
  Commands silently disappeared because the autoloader swallowed import errors.

  - Bundle all `@maltty/*` packages into CLI dist via `deps.alwaysBundle`
  - Add `MALTTY_DEBUG` env var support to surface autoload import failures
  - Add integration test asserting all commands appear in `--help` output
  - Republish all packages to sync npm exports maps with source

- Updated dependencies [1aee09e]
  - @maltty/utils@0.4.1

## 0.3.0

### Minor Changes

- 221aa01: Add `engines` field requiring Node.js >=24 and Bun >=1.3

### Patch Changes

- Updated dependencies [221aa01]
  - @maltty/utils@0.4.0

## 0.2.0

### Minor Changes

- 991a8f1: Targeted build clean: only remove maltty build artifacts instead of nuking the entire dist directory. Foreign files are preserved and a warning is printed when detected. Clean can be disabled via `build.clean: false` in config or `--no-clean` CLI flag.

## 0.1.8

### Patch Changes

- Updated dependencies [c9ca207]
  - @maltty/utils@0.3.0

## 0.1.7

### Patch Changes

- Updated dependencies [687e8a1]
  - @maltty/utils@0.2.0

## 0.1.6

### Patch Changes

- 0d0c61f: Comprehensive code review cleanup and refactoring across all packages:

  - Reorganize bundler into `build/`, `compile/`, `autoloader/`, `config/` subdirectories
  - Split core `types.ts` into `types/utility`, `types/middleware`, `types/command`, `types/cli`
  - Create shared `tsdown.base.mjs` config for all packages
  - Replace Result tuple literals with `ok()`/`err()` helpers
  - Replace custom type checks with `es-toolkit` equivalents
  - Fix missing `return` after `ctx.fail()` in CLI commands
  - Fix `onTargetComplete` firing on compile errors, convert sync I/O to async
  - Fix regex `lastIndex` mutation in sanitize via `replaceAll`
  - Remove dead code: duplicate `formatDurationInline`, unreachable guards, passthrough wrappers
  - Remove `toErrorMessage` in favor of `toError().message`, rename `fp/predicates` to `fp/transform`
  - Replace mutation inside `.filter()` with `.reduce()` in autoload and commands
  - Fix `command.name` override being ignored during registration (map key always took precedence)
  - Add README for all published packages
  - Add 80+ tests for runtime/args (zod, parser, register)

- Updated dependencies [0d0c61f]
  - @maltty/utils@0.1.5

## 0.1.5

### Patch Changes

- 5f46e63: Update all dependencies to latest versions

## 0.1.4

### Patch Changes

- 97b92b7: upgrade dependencies across all packages
- Updated dependencies [97b92b7]
  - @maltty/utils@0.1.4

## 0.1.3

### Patch Changes

- 6a538bc: upgrade dependencies across all packages
- Updated dependencies [6a538bc]
  - @maltty/utils@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [f48ad38]
  - @maltty/utils@0.1.2

## 0.1.1

### Patch Changes

- 02a4303: Rename `maltty` to `@maltty/core` and `maltty` to `@maltty/cli` to comply with npm's package naming policy. All imports, docs, and references updated.
- d8064fa: Add repository metadata and configure npm trusted publishing with OIDC
- Updated dependencies [02a4303]
- Updated dependencies [d8064fa]
  - @maltty/utils@0.1.1

## 0.1.0

### Minor Changes

- be8b790: Initial release

### Patch Changes

- Updated dependencies [be8b790]
  - @maltty/utils@0.1.0
