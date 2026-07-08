# maltty

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

### Minor Changes

- cac7f40: Expose the `maltty/store`, `maltty/project`, and `maltty/format` subpath exports. These modules were already built and documented, but the `exports` map omitted them, so the imports failed to resolve.

  - `maltty/store` — `createStore`, a file-backed JSON store that resolves project-local vs global directories
  - `maltty/project` — `findProjectRoot`, `resolvePath`, `resolveLocalPath`, `resolveGlobalPath`
  - `maltty/format` — standalone terminal formatters (`formatCheck`, `formatDuration`, `formatFinding`, `formatCodeFrame`, `formatSummary`)

### Patch Changes

- d211468: Upgrade dependencies to their latest versions — runtime deps (ink, react, c12, @clack/prompts, type-fest, fs-extra) and dev tooling (oxlint, oxfmt, vitest, tsdown, typescript, @types/node).
- Updated dependencies [cac7f40]
- Updated dependencies [d211468]
  - @maltty/config@1.0.0-rc.0
  - @maltty/utils@1.0.0-rc.0

## 0.24.0

### Minor Changes

- f8290a2: Fix Windows compatibility and remove unused submodule support.

  - `@maltty/bundler` —
    - Emit `file://` URL specifiers for autoload imports so Windows paths don't trigger PARSE_ERROR (`Invalid escape sequence`) when their backslashes are interpreted as escape sequences inside generated string literals.
    - Append `.exe` to compiled binary names for Windows targets so `CompiledBinary.path` matches the file bun actually produces on disk. Without this, fs operations on the recorded path failed on Windows and `clean()` had to enumerate both variants.
  - `@maltty/cli` — normalize template paths to forward slashes in `renderTemplate`, so the `gitignore` → `.gitignore` rename and the `--no-example`/`--no-config` filters in `maltty init` work on Windows (where `path.relative()` returns native `\` separators).
  - `@maltty/utils` —
    - `proc.exec` and `proc.spawn` now pass `shell: true` on Windows so npm/pnpm-installed `.cmd` shims (e.g. `tsx`) can be launched. Without this, Node's `CreateProcess` fails with `ENOENT` because it can only execute native `.exe` files. Affects `maltty run --engine=tsx` on Windows.
    - New `path` namespace exported from `@maltty/utils/node`: `toImportUrl(p)` (filesystem path → `file://` URL specifier) and `toPosixPath(p)` (native path → forward-slash form). Centralizes the cross-platform path helpers used by the autoloader, the bundler, and the CLI's template renderer.
  - `@maltty/core` (**breaking**) — remove unused git submodule detection. Drops `isInSubmodule`, `getParentRepoRoot`, and the `ProjectRoot` type from `@maltty/core`. `findProjectRoot()` now returns `string | null` (the project root path) instead of `ProjectRoot | null`. The submodule code was inherited from a project skeleton, had no internal callers, and was silently disabled on Windows.

### Patch Changes

- Updated dependencies [f8290a2]
  - @maltty/utils@0.4.2
  - @maltty/config@0.4.1

## 0.23.3

### Patch Changes

- ba12e4f: Forward `--verbose` from the `build` command into `bundler.build()` so the underlying tsdown error message is shown on bundle failure (previously only compile failures honored the flag). Also accept `DEBUG` as an alias for the `MALTTY_DEBUG` environment variable; `MALTTY_DEBUG` continues to take precedence when both are set.

## 0.23.2

### Patch Changes

- 45338ce: fix(core): register subcommands on Windows by importing via `file://` URLs

  `autoload` previously passed absolute filesystem paths directly to `import()`.
  On Windows those paths use backslashes, which are not valid ESM specifiers,
  so every command import threw `ERR_UNSUPPORTED_ESM_URL_SCHEME` and was
  silently swallowed — leaving the CLI with no subcommands registered and
  yargs reporting "Unknown arguments" for any positional. Paths are now
  converted to `file://` URLs via `pathToFileURL` before import.

## 0.23.1

### Patch Changes

- Updated dependencies [55071fa]
  - @maltty/config@0.4.0

## 0.23.0

### Minor Changes

- 03d59ca: Extract config loading from core runtime into an opt-in middleware (`@maltty/core/config`) with support for layered resolution (global > project > local). Config is no longer baked into `CommandContext` — it is added via module augmentation when the middleware is imported, keeping builds lean for CLIs that don't need config.

  **Breaking:** `ctx.config` is no longer available by default. Use the config middleware:

  ```ts
  import { config } from "@maltty/core/config";

  cli({
    middleware: [config({ schema: mySchema, layers: true })],
  });
  ```

### Patch Changes

- da87a23: Surface helpful error when `jiti` peer dependency is missing for stories, and display import errors instead of silent warning count when story discovery fails

## 0.22.1

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

## 0.22.0

### Minor Changes

- c904d99: feat(core): expose `ctx.raw.argv` — a normalized argv where `argv[0]` is always the CLI name (via yargs `$0`), regardless of invocation mode. Middleware can inspect the full invocation without guessing preamble offsets.

  Fixes #146

- c904d99: feat(core): allow `screen({ fullscreen })` to accept a resolver function `(ctx: ScreenContext) => boolean | Promise<boolean>` for runtime fullscreen decisions based on args, config, or terminal capabilities.

  Fixes #148

- c904d99: feat(core): export `render()` and `renderToString()` helpers that wrap Ink's render methods with maltty's `MalttyProvider` (screen context, output store, screen-backed log/spinner/report). Enables full lifecycle control from normal `command()` handlers.

  Fixes #147

- 97beb1e: Upgrade `@clack/prompts` from 1.1.0 to 1.2.0

## 0.21.0

### Minor Changes

- 221aa01: Surface `z.enum()` choices in `--help` output by extracting enum entries and passing them as yargs `choices`
- 0c90056: Add crash handlers that catch uncaught exceptions and unhandled rejections, displaying a clean fatal error message and writing a debug log to `/tmp` instead of showing raw runtime stack traces.

### Patch Changes

- Updated dependencies [221aa01]
  - @maltty/config@0.3.0
  - @maltty/utils@0.4.0

## 0.20.0

### Minor Changes

- d752216: Replace implicit input gating with explicit `PromptProps` (`focused`, `disabled`)

  - Add `PromptProps` interface with `focused` and `disabled` fields, shared by all prompt components
  - Remove `InputBlock` / `useInputBlock` context-based input gating
  - Remove `useFocus` from all prompt components (was conflicting with Tabs key interception)
  - Remove `@inkjs/ui` dependency (no longer needed)
  - Rename `isDisabled` to `disabled` across all prompts and stories
  - Stories viewer passes `focused` explicitly to story components in preview mode
  - Remove `useInput` proxy wrapper — all components now import `useInput` directly from `ink`

## 0.19.0

### Minor Changes

- 26f5a8d: fix(bundler): bundle all deps in compile mode to prevent bun compile failures

  `bun build --compile` re-bundles the input and errors when it can't resolve an import — even in dead code behind runtime guards. Previously, third-party deps like `ink` and `react` were left as external imports by tsdown, so bun compile would trace into `node_modules` and hit unresolvable optional deps (e.g. `react-devtools-core`, `node-fetch-native`).

  When `compile: true`, tsdown now inlines all dependencies (`alwaysBundle: [/./]`) so the bundled output is fully self-contained. A stub plugin replaces known optional/conditional deps (`chokidar`, `magicast`, `giget`, `react-devtools-core`) with empty modules during the tsdown phase, preventing resolution failures when inlining. User-defined externals and Node.js builtins are still honored.

  Also replaced the dynamic `import.meta.resolve` + `await import()` hack in `InputBarrier` with a static import of `ink/build/components/StdinContext.js`.

### Patch Changes

- Updated dependencies [991a8f1]
  - @maltty/config@0.2.0

## 0.18.0

### Minor Changes

- c9ca207: Remove dead and internal-only exports from public API surface. Drops 3 unused sub-entrypoints from `@maltty/core` (`./format`, `./store`, `./project`), deletes the dead `@maltty/utils/redact` module (source + tests), removes the `jsonc-parser` dead dependency from core, and trims `@maltty/bundler` to only externally consumed exports.

### Patch Changes

- Updated dependencies [c9ca207]
  - @maltty/utils@0.3.0
  - @maltty/config@0.1.8

## 0.17.0

### Minor Changes

- e724996: feat(core): add DisplayConfig and full clack API coverage

  Introduces `DisplayConfig` — a per-CLI configuration object that injects defaults into all clack-backed APIs (`ctx.log`, `ctx.prompts`, `ctx.status`). Only `aliases` and `messages` are applied globally via `updateSettings()`; everything else is merged per-call so method-level options always win.

  Also widens all maltty interfaces to match the full `@clack/prompts` API surface:

  - **Prompts**: `ConfirmOptions.vertical`, `PasswordOptions.clearOnError`, `GroupMultiSelectOptions.cursorAt`/`groupSpacing`, `AutocompleteOptions.initialUserInput`, `SelectKeyOptions.caseSensitive`, `PathOptions.validate` accepts `string | undefined`
  - **Spinner**: `cancel()`, `error()`, `clear()`, `isCancelled`
  - **ProgressBar**: `message()`, `cancel()`, `error()`, `clear()`, `isCancelled`
  - **TaskLog**: `group()` sub-groups, `TaskLogMessageOptions.raw`, `TaskLogCompletionOptions.showLog`, `TaskLogOptions.spacing`
  - **Log**: all level methods accept `LogMessageOptions` (symbol, spacing, secondarySymbol); `note` accepts `NoteOptions` with `format`; `BoxOptions.formatBorder`

- f0198b2: feat(core): add configurable `strict` mode for CLI, command, and screen

  Add `strict` option to `CliOptions`, `CommandDef`, and `ScreenDef` to control whether yargs rejects unknown flags. Defaults to `true` (existing behavior). Per-command `strict: false` overrides the CLI-level setting.

  feat(cli): add `maltty run` command

  New command to run the current maltty CLI project with three engine modes:

  - `node` (default) — builds first, then runs `node dist/index.mjs`
  - `tsx` — runs the source entry file directly via `tsx`
  - `binary` — builds and compiles, then executes the compiled binary

  Supports `--inspect`, `--inspect-brk`, `--inspect-wait`, and `--inspect-port` for debugging (node and tsx engines only). All unknown flags are forwarded to the executed CLI.

- f51a6b1: Add `figures` middleware that decorates `ctx.figures` with platform-appropriate terminal symbols from the `figures` package by sindresorhus
- 9a6fa77: feat(core): add interactive mode and declarative key binding hooks

  Adds interactive mode to the stories viewer, giving story components full terminal control with the header and sidebar hidden. Press `i` to enter interactive mode and double-press `Esc` to exit.

  Introduces reusable key handling primitives:

  - **keys.ts**: shared key vocabulary, pattern parser, and normalizer for Ink's `useInput`
  - **useKeyBinding**: declarative keymap hook supporting single keys, modifier combos, and multi-key sequences
  - **useKeyInput**: enhanced raw input hook with normalized key events

- 2995c8f: Reorganize UI components into prompts, display, and layout modules. Add new prompt components (Autocomplete, GroupMultiSelect, PathInput, SelectKey), display components (Alert, ProgressBar, Spinner, StatusMessage), and extract screen module with provider and context.

### Patch Changes

- ddc5140: Add `-h` alias for `--help` and `-v` alias for `--version`
- Updated dependencies [687e8a1]
  - @maltty/utils@0.2.0
  - @maltty/config@0.1.7

## 0.16.0

### Minor Changes

- d261106: Output component now reads the OutputStore from screen context automatically. The `store` prop and `OutputProps` type have been removed — use `<Output />` with no props inside `screen()` components.
- 7774af4: ### React-Backed Screen Context I/O

  Screen commands created with `screen()` now provide React-backed implementations of `ctx.log`, `ctx.spinner`, and `ctx.report` that render declaratively through the new `<Output />` component.

  #### What Changed

  Previously, `screen()` stripped imperative I/O properties (`log`, `spinner`, `report`) from the context because they wrote directly to stdout and would conflict with Ink's rendering. Now, `screen()` **swaps** them with React-backed implementations that push entries to an `OutputStore`, which `<Output />` subscribes to via `useSyncExternalStore`.

  This means the same `ctx.log.info()`, `ctx.spinner.start()`, and `ctx.report.check()` API works identically in both `command()` and `screen()` contexts — no separate rendering logic needed.

  #### New Exports from `@maltty/core/ui`

  | Export             | Description                                                                               |
  | ------------------ | ----------------------------------------------------------------------------------------- |
  | `<Output />`       | Component that renders accumulated log, spinner, and report entries from an `OutputStore` |
  | `useOutputStore()` | Hook to access the `OutputStore` from the current screen context                          |
  | `OutputStore`      | Type for the external store interface                                                     |
  | `OutputProps`      | Props type for the `Output` component                                                     |

  #### Usage

  ```tsx
  import {
    Output,
    screen,
    useApp,
    useOutputStore,
    useScreenContext,
  } from "@maltty/core/ui";
  import { useEffect, useRef } from "react";

  function MyScreen(): ReactElement {
    const ctx = useScreenContext();
    const store = useOutputStore();
    const { exit } = useApp();
    const started = useRef(false);

    useEffect(() => {
      if (started.current) return;
      started.current = true;

      const run = async (): Promise<void> => {
        ctx.spinner.start("Working...");
        await doWork();
        ctx.spinner.stop("Done");

        ctx.log.success("All tasks complete");
        exit();
      };

      void run();
    }, [ctx, exit]);

    return <Output store={store} />;
  }

  export default screen({
    description: "Example screen with output",
    render: MyScreen,
  });
  ```

  #### Middleware Support

  If middleware decorates the context with additional I/O (e.g. `report` from the report middleware), `screen()` automatically detects and swaps those with screen-backed versions too.

  #### Context Changes

  `ScreenContext` now retains `log` and `spinner` (React-backed). Only `colors`, `fail`, `format`, and `prompts` are stripped from the screen context, as they have no React equivalent.

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

- 4de44d3: Handle non-command/screen files in autoload gracefully instead of throwing

## 0.15.0

### Minor Changes

- d270f4b: Add Storybook-like TUI component browser for maltty screens. Define stories alongside components using `story()` and `stories()` factories with Zod schema introspection, then run `maltty stories` to get a fullscreen viewer with sidebar navigation, live preview, interactive props editor, and hot reload via file watcher.

## 0.14.0

### Minor Changes

- 008efc0: Rename `Context` to `CommandContext` and `useCommandContext` to `useScreenContext` for clearer delineation between command handlers and screen components.
- d5d83fd: Add `ctx.dotdir` — a `DotDirectoryClient` for scoped filesystem operations in CLI dot directories with file protection registry.
- 094e36e: Unify help config: rename `CliHelpOptions` to `HelpOptions`, move `order` from `CommandsConfig` to `HelpOptions`. `HelpOptions` is now used at both `cli()` and `command()` levels with `header`, `footer`, and `order` fields.

## 0.13.0

### Minor Changes

- 10799c2: Clear the alternate screen buffer before leaving fullscreen mode to prevent lingering content
- a53ee68: Add fullscreen mode for screens via alternate screen buffer. New `fullscreen` option on `ScreenDef`, `<FullScreen>` component, `useFullScreen` hook, and `useTerminalSize` hook.
- adb2879: Replace `useConfig()`, `useMeta()`, and `useStore()` screen hooks with a single `useCommandContext()` hook that returns a `ScreenContext`. The `ScreenContext` type exposes data properties (`args`, `config`, `meta`, `store`) and middleware-decorated properties (`auth`, `http`, etc.) while omitting imperative I/O properties (`log`, `spinner`, `prompts`, `fail`, `colors`, `format`) that conflict with Ink's rendering model. Remove internal `MalttyProvider`, `MalttyProviderProps`, `ScreenRenderProps`, `render`, `Instance`, and `RenderOptions` from the public UI exports.

## 0.12.0

### Minor Changes

- ed3eb91: Add module augmentation to report middleware

  - Added `declare module` augmentation so `ctx.report` is typed on all commands when `report()` middleware is registered at the `cli()` level, matching the existing `icons` middleware pattern.
  - Fixed `icons` example to use `ctx.log.raw()` and `ctx.format.table()` instead of removed `ctx.output` API.

## 0.11.0

### Minor Changes

- 9cd2217: Move logger, spinner, and prompts off base Context into a `logger()` middleware (`ctx.log`). Extract diagnostics into a `report()` middleware (`ctx.report`).
- 9e4abdc: Add `screen()` factory for building React/Ink TUI commands. Screens receive parsed args as component props; runtime context is available via `useConfig()`, `useMeta()`, and `useStore()` hooks through a `MalttyProvider`. Export all Ink primitives and `@inkjs/ui` components from `@maltty/core/ui`. Add `.tsx`/`.jsx` support to the bundler command scanner.

## 0.10.0

### Minor Changes

- d6e831c: Replace `system_profiler` font detection with pure JS directory scanning, reducing icons middleware startup from ~9.5s to ~140ms on macOS

## 0.9.0

### Minor Changes

- 4beaa57: Add `DirsConfig` option to `cli()` for configuring separate local and global directory names, and fix auth dir mismatch where `login()`/`logout()` hardcoded the store directory while `credential()` respected `auth.file({ dirName })` overrides.

## 0.8.2

### Patch Changes

- 2667bab: fix(packages/core,packages/bundler): exclude .d.ts files from command autoloader

  The `isCommandFile` and `findIndexEntry` functions used `extname()` to check
  file extensions, but `extname('build.d.ts')` returns `'.ts'`, causing `.d.ts`
  declaration files to pass the filter. When `@maltty/cli` is installed under
  `node_modules` and its `dist/commands/` directory contains `.d.ts` files, the
  runtime autoloader attempts to `import()` them, triggering a Node 24 type
  stripping error for files under `node_modules`.

## 0.8.1

### Patch Changes

- e6a1b85: Fix `packages/cli` bin field pointing to `.mjs` instead of `.js` (tsdown with `fixedExtension: false` and `"type":"module"` outputs `.js`). Add `setArgv` and `runTestCli` to the public `@maltty/core/test` entry point.

## 0.8.0

### Minor Changes

- e4ebe22: Add hidden, deprecated, and group support for commands and flags
  - Add `Resolvable<T>` utility type (`T | (() => T)`) for values resolved at registration time
  - Add `hidden` field on `CommandDef` and `YargsArgDef` to omit commands/flags from help output
  - Add `deprecated` field on `CommandDef` and `YargsArgDef` to show deprecation notices
  - Add `group` field on `YargsArgDef` to organize flags under headings in help output
  - Make `description` on `CommandDef` accept `Resolvable<string>` for dynamic resolution
  - All `Resolvable` fields are resolved once at registration time with zero runtime overhead

## 0.7.1

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

## 0.7.0

### Minor Changes

- be28e1c: Add `name` and `aliases` fields to command definitions. The `name` field overrides filename-derived names in the autoloader, and `aliases` registers alternative command names via yargs' native alias support.
- 25b015e: Add `@maltty/core/test` export with test utilities for handler, middleware, and integration testing. Includes `createTestContext`, `runHandler`, `runMiddleware`, `runCommand`, `mockPrompts`, `setupTestLifecycle`, `createWritableCapture`, `stripAnsi`, and `normalizeError`. Also extends `createContext` to accept optional `prompts` and `spinner` overrides for dependency injection.

## 0.6.0

### Minor Changes

- b1c8e9e: Refactor config client to use c12 for all config file resolution

  - Support `name.config.*` patterns (TS, JS, JSON, JSONC, YAML, TOML) via c12
  - Support `name.*` short-form patterns for data formats only (JSON, JSONC, YAML, TOML)
  - Long form (`name.config.*`) takes priority over short form (`name.*`)
  - Change `write()` default path from `.name.jsonc` to `name.config.jsonc`
  - Expand `ConfigFormat` to include `'ts' | 'js'` for TS/JS config files
  - Add `ConfigWriteFormat` type for write-only formats (`'json' | 'jsonc' | 'yaml'`)

- 440fc58: Replace `args` with separate `options` and `positionals` fields on command definitions.

  **Breaking:** The `args` field on `command()` has been removed. Use `options` for flags and `positionals` for positional arguments. Both accept a Zod object schema or a yargs-native record. The `PositionalDef` type has been removed. `ctx.args` remains unchanged at runtime — options and positionals are merged under the hood.

### Patch Changes

- e81d3a8: Replace `font-list` native module with platform-native shell commands for Nerd Font detection, fixing bundling failures caused by `font-list`'s internal `require("./libs/core")` not being preserved by tsdown/rolldown

## 0.5.1

### Patch Changes

- Updated dependencies [5f46e63]
  - @maltty/config@0.1.5

## 0.5.0

### Minor Changes

- a7dff7d: Add icons middleware with Nerd Font detection and interactive installation
- 6d8889a: Add `ConfigType` utility type and `CliConfig` augmentation interface for typed `ctx.config`.

  **@maltty/core:**

  - Add `ConfigType<TSchema>` utility type to derive `CliConfig` from a Zod schema
  - Rename `MalttyConfig` augmentation interface to `CliConfig` to avoid confusion with the build config type in `@maltty/config`
  - Export `CliConfig` and `ConfigType` from `@maltty/core`

  **@maltty/cli:**

  - Add `--config` flag to `maltty init` to scaffold config schema setup during project creation
  - Add `maltty add config` command to scaffold config into existing projects
  - Scaffolded config includes Zod schema with `ConfigType` module augmentation wiring

- 70deba8: Redesign output API: replace `ctx.output` with `ctx.format` and add styled logger methods.

  **Breaking changes:**

  - Remove `ctx.output` from the Context (replaced by `ctx.format` and `ctx.logger`)
  - Rename `SYMBOLS`/`Symbols` to `GLYPHS`/`Glyphs`
  - Rename format types: `ResultInput` to `CheckInput`, `DiagnosticInput` to `FindingInput`, `SummaryInput` to `TallyInput`, `TallySummaryInput` to `TallyBlockInput`, `InlineSummaryInput` to `TallyInlineInput`, `ResultStatus` to `CheckStatus`, `DiagnosticSeverity` to `FindingSeverity`
  - Rename format functions: `formatResult` to `formatCheck`, `formatDiagnostic` to `formatFinding`, `formatSummary` to `formatTally`

  **New features:**

  - Add `ctx.format.json(data)` and `ctx.format.table(rows)` — pure string formatters (no I/O)
  - Add `ctx.logger.check(input)` — write a pass/fail/warn/skip/fix row (vitest style)
  - Add `ctx.logger.finding(input)` — write a full finding with optional code frame (oxlint style)
  - Add `ctx.logger.tally(input)` — write a tally block or inline stats footer

  **Migration:**

  ```ts
  // Before
  ctx.output.result(input); // → ctx.logger.check(input)
  ctx.output.diagnostic(input); // → ctx.logger.finding(input)
  ctx.output.summary(input); // → ctx.logger.tally(input)
  ctx.output.write(data); // → process.stdout.write(ctx.format.json(data))
  ctx.output.table(rows); // → process.stdout.write(ctx.format.table(rows))
  ctx.output.raw(text); // → ctx.logger.print(text)
  ctx.output.markdown(text); // → ctx.logger.print(text)
  ```

### Patch Changes

- 0db5742: Refactor autoloader to extract shared filtering/mapping logic into `buildCommandMapFromEntries` helper, eliminating duplication between `autoload()` and `buildSubCommands()`

## 0.4.0

### Minor Changes

- 9f1b155: Auto-detect CLI version from package.json at build time

  The maltty bundler now reads the `version` field from the project's `package.json` during build and injects it as a compile-time constant (`__MALTTY_VERSION__`). At runtime, `cli()` no longer requires an explicit `version` option — it falls back to the injected constant automatically. Explicit `version` still takes precedence when provided. The build command output now displays the detected version.

- 2f7137b: Add customizable help header/footer and clean exit on no-command

  Add `CliHelpOptions` type with `header` and `footer` fields. `header` displays custom text (e.g., ASCII logo) above help output only when the CLI is invoked without a command. `footer` displays text below help output on all help (maps to yargs `.epilogue()`). When the CLI is invoked without a command, help is now shown to stdout (exit 0) instead of erroring via `demandCommand`.

- 61e22eb: Restructure commands as a grouped config object

  Replace the flat `commandOrder` option on `cli()` and `order` field on `command()` with a unified `CommandsConfig` object nested inside the `commands` field. The new structure groups command source (`path` or inline `commands` map) alongside display ordering under a single key. Backward compatibility is preserved — `commands` still accepts a plain string path or a `CommandMap`.

- ac61665: Add optional credential validation before persistence in auth middleware

  Add `ValidateCredential` callback type and optional `validate` field on `AuthOptions` (default for all logins) and `LoginOptions` (per-call override). When provided, the callback runs between strategy resolution and `store.save()` — if validation fails the credential is never persisted and a `validation_failed` error is returned. The callback may also transform or enrich the credential before it is saved.

### Patch Changes

- 97b92b7: upgrade dependencies across all packages
- Updated dependencies [97b92b7]
  - @maltty/utils@0.1.4
  - @maltty/config@0.1.4

## 0.3.0

### Minor Changes

- 19b8277: Redesign auth middleware API

  Rename `resolvers` to `strategies` across all auth types and functions. Remove bundled `auth({ http })` option in favor of standalone `http()` middleware. Add `login({ strategies })` override for interactive auth. Add `auth.headers()` factory for resolving auth headers from context. Add `auth.require()` enforcement gate middleware. Add `compose()` middleware combinator for merging multiple middleware into one.

### Patch Changes

- 7042b46: Fix coding standards violations across packages

  Replace `as` type assertions with type annotations, type guards, and documented exceptions. Replace `try/catch` blocks with `attempt`/`attemptAsync` from es-toolkit. Replace multi-branch `if/else` chains with `ts-pattern` `match` expressions. Rename `redactPaths` constant to `REDACT_PATHS`. Document intentional mutation and `throw` exceptions with inline comments.

- 6a538bc: upgrade dependencies across all packages
- Updated dependencies [6a538bc]
  - @maltty/utils@0.1.3
  - @maltty/config@0.1.3

## 0.2.0

### Minor Changes

- f48ad38: Add resolver builder functions, HTTP integration to auth middleware, and decouple standalone http() from auth

  **Resolver builders:** `auth.env()`, `auth.dotenv()`, `auth.file()`, `auth.oauth()`, `auth.deviceCode()`, `auth.token()`, `auth.custom()` provide construction sugar over raw config objects. Raw configs still work.

  **Auth HTTP integration:** `auth({ http: { baseUrl, namespace } })` creates authenticated HTTP clients with automatic credential header injection. Supports single or multiple clients via an array.

  **Breaking changes:**

  - `http()` no longer auto-reads `ctx.auth.credential()`. Use `auth({ http })` for authenticated clients or pass `headers` explicitly.
  - `HttpOptions.defaultHeaders` renamed to `headers` and now accepts a function `(ctx) => Record<string, string>` in addition to a static record.

  Before:

  ```ts
  middleware: [
    auth({ resolvers: [{ source: "env" }] }),
    http({ baseUrl: "https://api.example.com", namespace: "api" }),
  ];
  ```

  After:

  ```ts
  middleware: [
    auth({
      resolvers: [auth.env()],
      http: { baseUrl: "https://api.example.com", namespace: "api" },
    }),
  ];
  ```

- f48ad38: Replace non-standard OAuth flow with spec-compliant PKCE (RFC 7636) and add Device Authorization Grant (RFC 8628)

  The `oauth` resolver now implements the standard OAuth 2.0 Authorization Code flow with PKCE. The previous non-standard direct-token-POST flow has been removed entirely.

  **Breaking change:** `OAuthSourceConfig` now requires `clientId` and `tokenUrl` in addition to `authUrl`.

  Before:

  ```ts
  { source: 'oauth', authUrl: 'https://example.com/auth' }
  ```

  After:

  ```ts
  { source: 'oauth', clientId: 'my-client-id', authUrl: 'https://example.com/authorize', tokenUrl: 'https://example.com/token' }
  ```

  New `device-code` resolver added for headless/browserless environments (RFC 8628).

  **Breaking change:** Remove `lib/output` and `lib/prompts` sub-exports. The `Spinner` interface is now inlined in `context/types.ts` and prompts use `@clack/prompts` directly. Consumers importing from `@maltty/core/lib/output` or `@maltty/core/lib/prompts` must update to use `@clack/prompts` directly.

  **Breaking change:** Export `MiddlewareEnv` type from main entry point.

  **Breaking change:** `DeviceCodeSourceConfig` adds `openBrowser` option (defaults to `true`). Set to `false` for headless/CI/SSH environments.

  Include dotenv resolver in passive credential resolution (`ctx.auth.credential()`) alongside file and env resolvers.

  OAuth callback server now detects provider error redirects (e.g. `?error=access_denied`) and resolves immediately instead of waiting for timeout.

  Device-code and OAuth HTTP requests are now protected by `AbortSignal.timeout` to prevent hanging when endpoints are unresponsive.

  Add `signal` parameter to `postFormEncoded()` for timeout/cancellation support.

### Patch Changes

- fd5bfcd: Harden auth middleware against insecure transport and injection

  Enforce HTTPS on OAuth endpoint URLs (authUrl, tokenUrl, deviceAuthUrl) per RFC 8252 §8.3, allowing HTTP only for loopback addresses used during local redirect flows. Resolvers now return null for non-secure URLs.

  Escape `cmd.exe` metacharacters (`&`, `|`, `<`, `>`, `^`) in URLs passed to `cmd /c start` on Windows to prevent command injection via query strings.

  Remove redundant `existsSync` check in `loadFromPath` to eliminate a TOCTOU race condition, matching the pattern already used in the dotenv resolver.

- Updated dependencies [f48ad38]
  - @maltty/utils@0.1.2
  - @maltty/config@0.1.2

## 0.1.2

### Patch Changes

- 5c78d6a: Fix command export default typing by adding explicit `Command` return type to the `command()` factory and removing unsafe `as unknown as Command` casts from all command modules

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
