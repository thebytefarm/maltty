---
'@kidd-cli/bundler': patch
'@kidd-cli/cli': patch
'@kidd-cli/core': minor
'@kidd-cli/utils': patch
---

Fix Windows compatibility and remove unused submodule support.

- `@kidd-cli/bundler` —
  - Emit `file://` URL specifiers for autoload imports so Windows paths don't trigger PARSE_ERROR (`Invalid escape sequence`) when their backslashes are interpreted as escape sequences inside generated string literals.
  - Append `.exe` to compiled binary names for Windows targets so `CompiledBinary.path` matches the file bun actually produces on disk. Without this, fs operations on the recorded path failed on Windows and `clean()` had to enumerate both variants.
- `@kidd-cli/cli` — normalize template paths to forward slashes in `renderTemplate`, so the `gitignore` → `.gitignore` rename and the `--no-example`/`--no-config` filters in `kidd init` work on Windows (where `path.relative()` returns native `\` separators).
- `@kidd-cli/utils` — `proc.exec` and `proc.spawn` now pass `shell: true` on Windows so npm/pnpm-installed `.cmd` shims (e.g. `tsx`) can be launched. Without this, Node's `CreateProcess` fails with `ENOENT` because it can only execute native `.exe` files. Affects `kidd run --engine=tsx` on Windows.
- `@kidd-cli/core` (**breaking**) — remove unused git submodule detection. Drops `isInSubmodule`, `getParentRepoRoot`, and the `ProjectRoot` type from `@kidd-cli/core`. `findProjectRoot()` now returns `string | null` (the project root path) instead of `ProjectRoot | null`. The submodule code was inherited from a project skeleton, had no internal callers, and was silently disabled on Windows.
