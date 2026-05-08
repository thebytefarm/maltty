---
'@kidd-cli/cli': patch
'@kidd-cli/core': patch
---

Forward `--verbose` from the `build` command into `bundler.build()` so the underlying tsdown error message is shown on bundle failure (previously only compile failures honored the flag). Also accept `DEBUG` as an alias for the `KIDD_DEBUG` environment variable; `KIDD_DEBUG` continues to take precedence when both are set.
