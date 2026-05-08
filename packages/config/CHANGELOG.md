# @kidd-cli/config

## 0.4.1

### Patch Changes

- Updated dependencies [f8290a2]
  - @kidd-cli/utils@0.4.2

## 0.4.0

### Minor Changes

- 55071fa: Disable Bun's automatic `.env` and `bunfig.toml` loading in compiled binaries by default. Adds `autoloadDotenv` option to compile config for opt-in `.env` loading. `bunfig.toml` loading is always disabled.

## 0.3.1

### Patch Changes

- 1aee09e: fix(cli): bundle @kidd-cli/\* deps so published CLI is self-contained

  The published CLI had bare imports to workspace packages whose npm exports maps
  were stale (renamed subpaths like `./loader` → `./utils`, `./fs` → `./node`).
  Commands silently disappeared because the autoloader swallowed import errors.

  - Bundle all `@kidd-cli/*` packages into CLI dist via `deps.alwaysBundle`
  - Add `KIDD_DEBUG` env var support to surface autoload import failures
  - Add integration test asserting all commands appear in `--help` output
  - Republish all packages to sync npm exports maps with source

- Updated dependencies [1aee09e]
  - @kidd-cli/utils@0.4.1

## 0.3.0

### Minor Changes

- 221aa01: Add `engines` field requiring Node.js >=24 and Bun >=1.3

### Patch Changes

- Updated dependencies [221aa01]
  - @kidd-cli/utils@0.4.0

## 0.2.0

### Minor Changes

- 991a8f1: Targeted build clean: only remove kidd build artifacts instead of nuking the entire dist directory. Foreign files are preserved and a warning is printed when detected. Clean can be disabled via `build.clean: false` in config or `--no-clean` CLI flag.

## 0.1.8

### Patch Changes

- Updated dependencies [c9ca207]
  - @kidd-cli/utils@0.3.0

## 0.1.7

### Patch Changes

- Updated dependencies [687e8a1]
  - @kidd-cli/utils@0.2.0

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
  - @kidd-cli/utils@0.1.5

## 0.1.5

### Patch Changes

- 5f46e63: Update all dependencies to latest versions

## 0.1.4

### Patch Changes

- 97b92b7: upgrade dependencies across all packages
- Updated dependencies [97b92b7]
  - @kidd-cli/utils@0.1.4

## 0.1.3

### Patch Changes

- 6a538bc: upgrade dependencies across all packages
- Updated dependencies [6a538bc]
  - @kidd-cli/utils@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [f48ad38]
  - @kidd-cli/utils@0.1.2

## 0.1.1

### Patch Changes

- 02a4303: Rename `kidd` to `@kidd-cli/core` and `kidd-cli` to `@kidd-cli/cli` to comply with npm's package naming policy. All imports, docs, and references updated.
- d8064fa: Add repository metadata and configure npm trusted publishing with OIDC
- Updated dependencies [02a4303]
- Updated dependencies [d8064fa]
  - @kidd-cli/utils@0.1.1

## 0.1.0

### Minor Changes

- be8b790: Initial release

### Patch Changes

- Updated dependencies [be8b790]
  - @kidd-cli/utils@0.1.0
