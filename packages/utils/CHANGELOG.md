# @maltty/utils

## 1.0.0-rc.0

### Major Changes

- 5c6e385: End-to-end rename. The framework was previously published under `@kidd-cli/*`, then briefly under `@maltty/*`, and is now consolidated as **`maltty`** (the runtime you import) plus a few scoped support packages. The CLI binary, config file convention, env var prefix, and several public types were renamed to match.

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

## 0.4.2

### Patch Changes

- f8290a2: Fix Windows compatibility and remove unused submodule support.

  - `@maltty/bundler` —
    - Emit `file://` URL specifiers for autoload imports so Windows paths don't trigger PARSE_ERROR (`Invalid escape sequence`) when their backslashes are interpreted as escape sequences inside generated string literals.
    - Append `.exe` to compiled binary names for Windows targets so `CompiledBinary.path` matches the file bun actually produces on disk. Without this, fs operations on the recorded path failed on Windows and `clean()` had to enumerate both variants.
  - `@maltty/cli` — normalize template paths to forward slashes in `renderTemplate`, so the `gitignore` → `.gitignore` rename and the `--no-example`/`--no-config` filters in `maltty init` work on Windows (where `path.relative()` returns native `\` separators).
  - `@maltty/utils` —
    - `proc.exec` and `proc.spawn` now pass `shell: true` on Windows so npm/pnpm-installed `.cmd` shims (e.g. `tsx`) can be launched. Without this, Node's `CreateProcess` fails with `ENOENT` because it can only execute native `.exe` files. Affects `maltty run --engine=tsx` on Windows.
    - New `path` namespace exported from `@maltty/utils/node`: `toImportUrl(p)` (filesystem path → `file://` URL specifier) and `toPosixPath(p)` (native path → forward-slash form). Centralizes the cross-platform path helpers used by the autoloader, the bundler, and the CLI's template renderer.
  - `@maltty/core` (**breaking**) — remove unused git submodule detection. Drops `isInSubmodule`, `getParentRepoRoot`, and the `ProjectRoot` type from `@maltty/core`. `findProjectRoot()` now returns `string | null` (the project root path) instead of `ProjectRoot | null`. The submodule code was inherited from a project skeleton, had no internal callers, and was silently disabled on Windows.

## 0.4.1

### Patch Changes

- 1aee09e: fix(cli): bundle @maltty/\* deps so published CLI is self-contained

  The published CLI had bare imports to workspace packages whose npm exports maps
  were stale (renamed subpaths like `./loader` → `./utils`, `./fs` → `./node`).
  Commands silently disappeared because the autoloader swallowed import errors.

  - Bundle all `@maltty/*` packages into CLI dist via `deps.alwaysBundle`
  - Add `MALTTY_DEBUG` env var support to surface autoload import failures
  - Add integration test asserting all commands appear in `--help` output
  - Republish all packages to sync npm exports maps with source

## 0.4.0

### Minor Changes

- 221aa01: Add `engines` field requiring Node.js >=24 and Bun >=1.3

## 0.3.0

### Minor Changes

- c9ca207: Remove dead and internal-only exports from public API surface. Drops 3 unused sub-entrypoints from `@maltty/core` (`./format`, `./store`, `./project`), deletes the dead `@maltty/utils/redact` module (source + tests), removes the `jsonc-parser` dead dependency from core, and trims `@maltty/bundler` to only externally consumed exports.

## 0.2.0

### Minor Changes

- 687e8a1: Replace wildcard re-exports (`export *`) with explicit named exports for `es-toolkit` and `ts-pattern` in the `fp` barrel module, enabling proper tree-shaking in downstream CLI bundles. Previously the entire `es-toolkit` library (193 modules) was bundled even when only 7 functions were used.

## 0.1.5

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

## 0.1.4

### Patch Changes

- 97b92b7: upgrade dependencies across all packages

## 0.1.3

### Patch Changes

- 6a538bc: upgrade dependencies across all packages

## 0.1.2

### Patch Changes

- f48ad38: Add `fileExists` utility for checking file existence without throwing

## 0.1.1

### Patch Changes

- 02a4303: Rename `maltty` to `@maltty/core` and `maltty` to `@maltty/cli` to comply with npm's package naming policy. All imports, docs, and references updated.
- d8064fa: Add repository metadata and configure npm trusted publishing with OIDC

## 0.1.0

### Minor Changes

- be8b790: Initial release
