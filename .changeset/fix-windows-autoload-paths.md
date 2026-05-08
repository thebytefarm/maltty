---
'@kidd-cli/core': patch
---

fix(core): register subcommands on Windows by importing via `file://` URLs

`autoload` previously passed absolute filesystem paths directly to `import()`.
On Windows those paths use backslashes, which are not valid ESM specifiers,
so every command import threw `ERR_UNSUPPORTED_ESM_URL_SCHEME` and was
silently swallowed — leaving the CLI with no subcommands registered and
yargs reporting "Unknown arguments" for any positional. Paths are now
converted to `file://` URLs via `pathToFileURL` before import.
