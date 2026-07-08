# maltty

## 0.11.9

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
  - @maltty/bundler@0.9.1
  - @maltty/core@0.24.0
  - @maltty/utils@0.4.2
  - @maltty/config@0.4.1

## 0.11.8

### Patch Changes

- ba12e4f: Forward `--verbose` from the `build` command into `bundler.build()` so the underlying tsdown error message is shown on bundle failure (previously only compile failures honored the flag). Also accept `DEBUG` as an alias for the `MALTTY_DEBUG` environment variable; `MALTTY_DEBUG` continues to take precedence when both are set.
- Updated dependencies [ba12e4f]
  - @maltty/core@0.23.3

## 0.11.7

### Patch Changes

- Updated dependencies [45338ce]
  - @maltty/core@0.23.2

## 0.11.6

### Patch Changes

- 8980190: Fix security vulnerabilities in dependencies: upgrade liquidjs to >=10.25.7 (DoS via circular block reference), add pnpm overrides for tar (path traversal), vite (fs.deny bypass, file read, path traversal), postcss (XSS), fast-xml-parser (injection), and uuid (buffer bounds check)

## 0.11.5

### Patch Changes

- Updated dependencies [55071fa]
  - @maltty/config@0.4.0
  - @maltty/bundler@0.9.0
  - @maltty/core@0.23.1

## 0.11.4

### Patch Changes

- Updated dependencies [f5d402a]
  - @maltty/bundler@0.8.0

## 0.11.3

### Patch Changes

- Updated dependencies [03d59ca]
- Updated dependencies [da87a23]
  - @maltty/core@0.23.0

## 0.11.2

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
  - @maltty/core@0.22.1
  - @maltty/config@0.3.1
  - @maltty/utils@0.4.1
  - @maltty/bundler@0.7.1

## 0.11.1

### Patch Changes

- Updated dependencies [c904d99]
- Updated dependencies [c904d99]
- Updated dependencies [501110e]
- Updated dependencies [c904d99]
- Updated dependencies [97beb1e]
  - @maltty/core@0.22.0
  - @maltty/bundler@0.7.0

## 0.11.0

### Minor Changes

- 221aa01: Add `engines` field requiring Node.js >=24 and Bun >=1.3

### Patch Changes

- 31b7233: Replace tsdown with Bun.build as the bundler backend, running builds via a subprocess runner for improved performance and binary compilation support.

  ## Migration

  ### Bun is now required at build time

  Previously, only `bun build --compile` (the compile step) required Bun. Now the bundling step itself runs inside a Bun subprocess. Ensure `bun` (v1.3.11+) is installed in all environments where `maltty build` or `maltty dev` runs, including CI pipelines.

  If your CI only installs Bun for the compile step, you must now install it earlier so the build step can also use it.

  ### Output file extension changed from `.mjs` to `.js`

  Build output is now `dist/index.js` instead of `dist/index.mjs`. If you have hardcoded references to the `.mjs` extension (e.g., in dev scripts, custom launchers, or import paths), update them to `.js`.

  ### tsdown is no longer a dependency

  The `tsdown` package has been removed from `@maltty/bundler`'s dependencies. If your project relied on tsdown being transitively available through maltty, add it as a direct dependency instead.

- Updated dependencies [31b7233]
- Updated dependencies [221aa01]
- Updated dependencies [221aa01]
- Updated dependencies [0c90056]
  - @maltty/bundler@0.6.0
  - @maltty/config@0.3.0
  - @maltty/utils@0.4.0
  - @maltty/core@0.21.0

## 0.10.1

### Patch Changes

- Updated dependencies [d752216]
  - @maltty/core@0.20.0

## 0.10.0

### Minor Changes

- 991a8f1: Targeted build clean: only remove maltty build artifacts instead of nuking the entire dist directory. Foreign files are preserved and a warning is printed when detected. Clean can be disabled via `build.clean: false` in config or `--no-clean` CLI flag.

### Patch Changes

- Updated dependencies [26f5a8d]
- Updated dependencies [991a8f1]
  - @maltty/bundler@0.5.0
  - @maltty/core@0.19.0
  - @maltty/config@0.2.0

## 0.9.0

### Minor Changes

- ef2b663: Add executable bin shebang wrapper and fix CLI display name to "maltty"

## 0.8.1

### Patch Changes

- Updated dependencies [c9ca207]
  - @maltty/core@0.18.0
  - @maltty/utils@0.3.0
  - @maltty/bundler@0.4.0
  - @maltty/config@0.1.8

## 0.8.0

### Minor Changes

- f0198b2: feat(core): add configurable `strict` mode for CLI, command, and screen

  Add `strict` option to `CliOptions`, `CommandDef`, and `ScreenDef` to control whether yargs rejects unknown flags. Defaults to `true` (existing behavior). Per-command `strict: false` overrides the CLI-level setting.

  feat(cli): add `maltty run` command

  New command to run the current maltty CLI project with three engine modes:

  - `node` (default) — builds first, then runs `node dist/index.mjs`
  - `tsx` — runs the source entry file directly via `tsx`
  - `binary` — builds and compiles, then executes the compiled binary

  Supports `--inspect`, `--inspect-brk`, `--inspect-wait`, and `--inspect-port` for debugging (node and tsx engines only). All unknown flags are forwarded to the executed CLI.

### Patch Changes

- Updated dependencies [e724996]
- Updated dependencies [f0198b2]
- Updated dependencies [f51a6b1]
- Updated dependencies [687e8a1]
- Updated dependencies [ddc5140]
- Updated dependencies [9a6fa77]
- Updated dependencies [2995c8f]
  - @maltty/core@0.17.0
  - @maltty/utils@0.2.0
  - @maltty/bundler@0.3.2
  - @maltty/config@0.1.7

## 0.7.0

### Minor Changes

- 7774af4: ### Stories Viewer Enhancements

  #### `--out` Option

  Render stories to stdout with `maltty stories --out`. Supports `Group/Variant` filter format to target a specific story (e.g. `maltty stories --out "StatusBadge/Error"`). Useful for CI snapshots and scripted output.

  #### `--check` Flag

  Validate stories for common issues with `maltty stories --check`. Enforces a maximum of 6 editable fields per story and runs prop validation against the Zod schema. Reports diagnostics using the new screen-backed `ctx.report` interface.

  #### Sidebar Improvements

  - **Toggle visibility**: press `b` to hide/show the sidebar for a borderless full-width preview
  - **Collapsed by default**: sidebar groups start collapsed with folder icons for cleaner navigation

  #### `defaults` Field

  `stories()` now accepts a `defaults` record for non-editable fixed context props. Values in `defaults` are merged into the rendered component but do not appear in the props editor, keeping the editor focused on the fields that matter.

  #### Editable Field Limit

  Stories are limited to 6 editable fields. Excess fields should be moved to `defaults`. The `--check` flag validates this constraint.

### Patch Changes

- Updated dependencies [4de44d3]
- Updated dependencies [d261106]
- Updated dependencies [7774af4]
- Updated dependencies [7774af4]
  - @maltty/core@0.16.0

## 0.6.0

### Minor Changes

- d270f4b: Add Storybook-like TUI component browser for maltty screens. Define stories alongside components using `story()` and `stories()` factories with Zod schema introspection, then run `maltty stories` to get a fullscreen viewer with sidebar navigation, live preview, interactive props editor, and hot reload via file watcher.

### Patch Changes

- Updated dependencies [d270f4b]
  - @maltty/core@0.15.0

## 0.5.2

### Patch Changes

- 094e36e: Unify help config: rename `CliHelpOptions` to `HelpOptions`, move `order` from `CommandsConfig` to `HelpOptions`. `HelpOptions` is now used at both `cli()` and `command()` levels with `header`, `footer`, and `order` fields.
- Updated dependencies [008efc0]
- Updated dependencies [d5d83fd]
- Updated dependencies [094e36e]
  - @maltty/core@0.14.0

## 0.5.1

### Patch Changes

- Updated dependencies [82740fc]
- Updated dependencies [10799c2]
- Updated dependencies [a53ee68]
- Updated dependencies [adb2879]
  - @maltty/bundler@0.3.1
  - @maltty/core@0.13.0

## 0.5.0

### Minor Changes

- ed3eb91: Fix `--compile` failures on CI

  - Moved `chokidar`, `magicast`, and `giget` externalization from `bun build --compile` to the tsdown `neverBundle` config. These c12 optional deps were causing failures in strict pnpm layouts (e.g. GitHub Actions) where Bun couldn't resolve them even when marked as `--external`.
  - Added `--verbose` flag to `maltty build` that surfaces bun's stderr output on compile failures.
  - Captured stderr from `execFile` in `execBunBuild` so compile errors include actionable diagnostics.

### Patch Changes

- Updated dependencies [ed3eb91]
- Updated dependencies [ed3eb91]
  - @maltty/bundler@0.3.0
  - @maltty/core@0.12.0

## 0.4.10

### Patch Changes

- 9cd2217: Move logger, spinner, and prompts off base Context into a `logger()` middleware (`ctx.log`). Extract diagnostics into a `report()` middleware (`ctx.report`).
- Updated dependencies [9cd2217]
- Updated dependencies [9e4abdc]
  - @maltty/core@0.11.0
  - @maltty/bundler@0.2.6

## 0.4.9

### Patch Changes

- Updated dependencies [d6e831c]
  - @maltty/core@0.10.0

## 0.4.8

### Patch Changes

- Updated dependencies [4beaa57]
  - @maltty/core@0.9.0

## 0.4.7

### Patch Changes

- Updated dependencies [567e7f4]
  - @maltty/bundler@0.2.5

## 0.4.6

### Patch Changes

- Updated dependencies [c8dd951]
  - @maltty/bundler@0.2.4

## 0.4.5

### Patch Changes

- Updated dependencies [2667bab]
  - @maltty/core@0.8.2
  - @maltty/bundler@0.2.3

## 0.4.4

### Patch Changes

- e6a1b85: Fix `packages/cli` bin field pointing to `.mjs` instead of `.js` (tsdown with `fixedExtension: false` and `"type":"module"` outputs `.js`). Add `setArgv` and `runTestCli` to the public `@maltty/core/test` entry point.
- Updated dependencies [e6a1b85]
  - @maltty/core@0.8.1

## 0.4.3

### Patch Changes

- Updated dependencies [e4ebe22]
  - @maltty/core@0.8.0

## 0.4.2

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
  - @maltty/core@0.7.1
  - @maltty/bundler@0.2.2
  - @maltty/config@0.1.6

## 0.4.1

### Patch Changes

- Updated dependencies [be28e1c]
- Updated dependencies [25b015e]
  - @maltty/core@0.7.0

## 0.4.0

### Minor Changes

- 440fc58: Replace `args` with separate `options` and `positionals` fields on command definitions.

  **Breaking:** The `args` field on `command()` has been removed. Use `options` for flags and `positionals` for positional arguments. Both accept a Zod object schema or a yargs-native record. The `PositionalDef` type has been removed. `ctx.args` remains unchanged at runtime — options and positionals are merged under the hood.

### Patch Changes

- Updated dependencies [b1c8e9e]
- Updated dependencies [e81d3a8]
- Updated dependencies [440fc58]
  - @maltty/core@0.6.0

## 0.3.1

### Patch Changes

- 06dfbf1: Read template versions from pnpm-workspace.yaml at runtime instead of hardcoded constants
- 5f46e63: Update all dependencies to latest versions
- Updated dependencies [a86bacc]
- Updated dependencies [5f46e63]
  - @maltty/bundler@0.2.1
  - @maltty/config@0.1.5
  - @maltty/core@0.5.1

## 0.3.0

### Minor Changes

- 6d8889a: Add `ConfigType` utility type and `CliConfig` augmentation interface for typed `ctx.config`.

  **@maltty/core:**

  - Add `ConfigType<TSchema>` utility type to derive `CliConfig` from a Zod schema
  - Rename `MalttyConfig` augmentation interface to `CliConfig` to avoid confusion with the build config type in `@maltty/config`
  - Export `CliConfig` and `ConfigType` from `@maltty/core`

  **@maltty/cli:**

  - Add `--config` flag to `maltty init` to scaffold config schema setup during project creation
  - Add `maltty add config` command to scaffold config into existing projects
  - Scaffolded config includes Zod schema with `ConfigType` module augmentation wiring

### Patch Changes

- 0db5742: Convert `loadCLIManifest` from throwing errors to returning Result tuples and add warning logs when version resolution falls back to `0.0.0` in the init command
- Updated dependencies [a7dff7d]
- Updated dependencies [0db5742]
- Updated dependencies [6d8889a]
- Updated dependencies [70deba8]
  - @maltty/core@0.5.0

## 0.2.0

### Minor Changes

- 61e22eb: Restructure commands as a grouped config object

  Replace the flat `commandOrder` option on `cli()` and `order` field on `command()` with a unified `CommandsConfig` object nested inside the `commands` field. The new structure groups command source (`path` or inline `commands` map) alongside display ordering under a single key. Backward compatibility is preserved — `commands` still accepts a plain string path or a `CommandMap`.

### Patch Changes

- 9f1b155: Auto-detect CLI version from package.json at build time

  The maltty bundler now reads the `version` field from the project's `package.json` during build and injects it as a compile-time constant (`__MALTTY_VERSION__`). At runtime, `cli()` no longer requires an explicit `version` option — it falls back to the injected constant automatically. Explicit `version` still takes precedence when provided. The build command output now displays the detected version.

- 97b92b7: upgrade dependencies across all packages
- Updated dependencies [9f1b155]
- Updated dependencies [2f7137b]
- Updated dependencies [61e22eb]
- Updated dependencies [fc486c6]
- Updated dependencies [97b92b7]
- Updated dependencies [ac61665]
  - @maltty/bundler@0.2.0
  - @maltty/core@0.4.0
  - @maltty/utils@0.1.4
  - @maltty/config@0.1.4

## 0.1.4

### Patch Changes

- 7042b46: Fix coding standards violations across packages

  Replace `as` type assertions with type annotations, type guards, and documented exceptions. Replace `try/catch` blocks with `attempt`/`attemptAsync` from es-toolkit. Replace multi-branch `if/else` chains with `ts-pattern` `match` expressions. Rename `redactPaths` constant to `REDACT_PATHS`. Document intentional mutation and `throw` exceptions with inline comments.

- 4387e02: Sync init template dependency versions from pnpm-workspace.yaml catalog

  Replace hardcoded zod, typescript, vitest, and tsdown versions in the init template with liquid variables sourced from a generated constants file. Add a laufen script (`sync-template-versions`) to regenerate the constants from the pnpm catalog, and a test to catch version drift.

- 6a538bc: upgrade dependencies across all packages
- Updated dependencies [7042b46]
- Updated dependencies [19b8277]
- Updated dependencies [6a538bc]
  - @maltty/core@0.3.0
  - @maltty/utils@0.1.3
  - @maltty/config@0.1.3
  - @maltty/bundler@0.1.3

## 0.1.3

### Patch Changes

- f48ad38: Refactor CLI commands to use shared config helpers and validation utilities
- Updated dependencies [f48ad38]
- Updated dependencies [fd5bfcd]
- Updated dependencies [f48ad38]
- Updated dependencies [f48ad38]
  - @maltty/core@0.2.0
  - @maltty/utils@0.1.2
  - @maltty/bundler@0.1.2
  - @maltty/config@0.1.2

## 0.1.2

### Patch Changes

- 5c78d6a: Fix command export default typing by adding explicit `Command` return type to the `command()` factory and removing unsafe `as unknown as Command` casts from all command modules
- Updated dependencies [5c78d6a]
  - @maltty/core@0.1.2

## 0.1.1

### Patch Changes

- 02a4303: Rename `maltty` to `@maltty/core` and `maltty` to `@maltty/cli` to comply with npm's package naming policy. All imports, docs, and references updated.
- 442dce2: scaffold `maltty.config.ts` instead of `tsdown.config.ts` in init templates
- d8064fa: Add repository metadata and configure npm trusted publishing with OIDC
- Updated dependencies [02a4303]
- Updated dependencies [d8064fa]
  - @maltty/core@0.1.1
  - @maltty/bundler@0.1.1
  - @maltty/config@0.1.1
  - @maltty/utils@0.1.1

## 0.1.0

### Minor Changes

- be8b790: Initial release

### Patch Changes

- Updated dependencies [be8b790]
  - maltty@0.1.0
  - @maltty/utils@0.1.0
  - @maltty/config@0.1.0
  - @maltty/bundler@0.1.0
