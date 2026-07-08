# @maltty/bundler

## 0.9.1

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

- Updated dependencies [f8290a2]
  - @maltty/utils@0.4.2
  - @maltty/config@0.4.1

## 0.9.0

### Minor Changes

- 55071fa: Disable Bun's automatic `.env` and `bunfig.toml` loading in compiled binaries by default. Adds `autoloadDotenv` option to compile config for opt-in `.env` loading. `bunfig.toml` loading is always disabled.

### Patch Changes

- Updated dependencies [55071fa]
  - @maltty/config@0.4.0

## 0.8.0

### Minor Changes

- f5d402a: Add verbose error logging to tsdown build and watch steps, matching the existing bun compile behavior

## 0.7.1

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
  - @maltty/config@0.3.1
  - @maltty/utils@0.4.1

## 0.7.0

### Minor Changes

- 501110e: Revert Bun.build migration and restore tsdown as the bundler.

  - Restore `map-config.ts` with tsdown InlineConfig mapping (build + watch)
  - Restore simpler autoload plugin (no `coreDistDir` needed)
  - Restore tsdown native watch mode
  - Remove `@maltty/core` dependency (no longer needed)
  - Remove `bun-runner.ts` subprocess architecture
  - Restore `NODE_BUILTINS` and `neverBundle` for proper externalization

## 0.6.0

### Minor Changes

- 31b7233: Replace tsdown with Bun.build as the bundler backend, running builds via a subprocess runner for improved performance and binary compilation support.

  ## Migration

  ### Bun is now required at build time

  Previously, only `bun build --compile` (the compile step) required Bun. Now the bundling step itself runs inside a Bun subprocess. Ensure `bun` (v1.3.11+) is installed in all environments where `maltty build` or `maltty dev` runs, including CI pipelines.

  If your CI only installs Bun for the compile step, you must now install it earlier so the build step can also use it.

  ### Output file extension changed from `.mjs` to `.js`

  Build output is now `dist/index.js` instead of `dist/index.mjs`. If you have hardcoded references to the `.mjs` extension (e.g., in dev scripts, custom launchers, or import paths), update them to `.js`.

  ### tsdown is no longer a dependency

  The `tsdown` package has been removed from `@maltty/bundler`'s dependencies. If your project relied on tsdown being transitively available through maltty, add it as a direct dependency instead.

- 221aa01: Add `engines` field requiring Node.js >=24 and Bun >=1.3

### Patch Changes

- Updated dependencies [221aa01]
  - @maltty/config@0.3.0
  - @maltty/utils@0.4.0

## 0.5.0

### Minor Changes

- 26f5a8d: fix(bundler): bundle all deps in compile mode to prevent bun compile failures

  `bun build --compile` re-bundles the input and errors when it can't resolve an import — even in dead code behind runtime guards. Previously, third-party deps like `ink` and `react` were left as external imports by tsdown, so bun compile would trace into `node_modules` and hit unresolvable optional deps (e.g. `react-devtools-core`, `node-fetch-native`).

  When `compile: true`, tsdown now inlines all dependencies (`alwaysBundle: [/./]`) so the bundled output is fully self-contained. A stub plugin replaces known optional/conditional deps (`chokidar`, `magicast`, `giget`, `react-devtools-core`) with empty modules during the tsdown phase, preventing resolution failures when inlining. User-defined externals and Node.js builtins are still honored.

  Also replaced the dynamic `import.meta.resolve` + `await import()` hack in `InputBarrier` with a static import of `ink/build/components/StdinContext.js`.

- 991a8f1: Targeted build clean: only remove maltty build artifacts instead of nuking the entire dist directory. Foreign files are preserved and a warning is printed when detected. Clean can be disabled via `build.clean: false` in config or `--no-clean` CLI flag.

### Patch Changes

- Updated dependencies [991a8f1]
  - @maltty/config@0.2.0

## 0.4.0

### Minor Changes

- c9ca207: Remove dead and internal-only exports from public API surface. Drops 3 unused sub-entrypoints from `@maltty/core` (`./format`, `./store`, `./project`), deletes the dead `@maltty/utils/redact` module (source + tests), removes the `jsonc-parser` dead dependency from core, and trims `@maltty/bundler` to only externally consumed exports.

### Patch Changes

- Updated dependencies [c9ca207]
  - @maltty/utils@0.3.0
  - @maltty/config@0.1.8

## 0.3.2

### Patch Changes

- Updated dependencies [687e8a1]
  - @maltty/utils@0.2.0
  - @maltty/config@0.1.7

## 0.3.1

### Patch Changes

- 82740fc: Check that `bun` exists in PATH before compiling; return a descriptive error when it is missing

## 0.3.0

### Minor Changes

- ed3eb91: Fix `--compile` failures on CI

  - Moved `chokidar`, `magicast`, and `giget` externalization from `bun build --compile` to the tsdown `neverBundle` config. These c12 optional deps were causing failures in strict pnpm layouts (e.g. GitHub Actions) where Bun couldn't resolve them even when marked as `--external`.
  - Added `--verbose` flag to `maltty build` that surfaces bun's stderr output on compile failures.
  - Captured stderr from `execFile` in `execBunBuild` so compile errors include actionable diagnostics.

## 0.2.6

### Patch Changes

- 9e4abdc: Add `screen()` factory for building React/Ink TUI commands. Screens receive parsed args as component props; runtime context is available via `useConfig()`, `useMeta()`, and `useStore()` hooks through a `MalttyProvider`. Export all Ink primitives and `@inkjs/ui` components from `@maltty/core/ui`. Add `.tsx`/`.jsx` support to the bundler command scanner.

## 0.2.5

### Patch Changes

- 567e7f4: Fix autoload plugin region marker mismatch (`autoloader.ts` → `autoload.ts`) that prevented the static autoloader from replacing the runtime filesystem scanner during `maltty build`

## 0.2.4

### Patch Changes

- c8dd951: Move tsdown from devDependencies to dependencies to fix runtime module resolution

## 0.2.3

### Patch Changes

- 2667bab: fix(packages/core,packages/bundler): exclude .d.ts files from command autoloader

  The `isCommandFile` and `findIndexEntry` functions used `extname()` to check
  file extensions, but `extname('build.d.ts')` returns `'.ts'`, causing `.d.ts`
  declaration files to pass the filter. When `@maltty/cli` is installed under
  `node_modules` and its `dist/commands/` directory contains `.d.ts` files, the
  runtime autoloader attempts to `import()` them, triggering a Node 24 type
  stripping error for files under `node_modules`.

## 0.2.2

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
  - @maltty/config@0.1.6

## 0.2.1

### Patch Changes

- a86bacc: Update tsdown from 0.21.1 to 0.21.2
- Updated dependencies [5f46e63]
  - @maltty/config@0.1.5

## 0.2.0

### Minor Changes

- 9f1b155: Auto-detect CLI version from package.json at build time

  The maltty bundler now reads the `version` field from the project's `package.json` during build and injects it as a compile-time constant (`__MALTTY_VERSION__`). At runtime, `cli()` no longer requires an explicit `version` option — it falls back to the injected constant automatically. Explicit `version` still takes precedence when provided. The build command output now displays the detected version.

### Patch Changes

- fc486c6: Silence tsdown build output so only clack/prompts UI is shown to the user
- 97b92b7: upgrade dependencies across all packages
- Updated dependencies [97b92b7]
  - @maltty/utils@0.1.4
  - @maltty/config@0.1.4

## 0.1.3

### Patch Changes

- 6a538bc: upgrade dependencies across all packages
- Updated dependencies [6a538bc]
  - @maltty/utils@0.1.3
  - @maltty/config@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [f48ad38]
  - @maltty/utils@0.1.2
  - @maltty/config@0.1.2

## 0.1.1

### Patch Changes

- 02a4303: Rename `maltty` to `@maltty/core` and `maltty` to `@maltty/cli` to comply with npm's package naming policy. All imports, docs, and references updated.
- d8064fa: Add repository metadata and configure npm trusted publishing with OIDC
- Updated dependencies [02a4303]
- Updated dependencies [d8064fa]
  - @maltty/config@0.1.1
  - @maltty/utils@0.1.1

## 0.1.0

### Minor Changes

- be8b790: Initial release

### Patch Changes

- Updated dependencies [be8b790]
  - @maltty/utils@0.1.0
  - @maltty/config@0.1.0
