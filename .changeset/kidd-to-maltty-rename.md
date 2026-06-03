---
'@maltty/core': minor
'@maltty/cli': minor
'@maltty/config': minor
'@maltty/utils': minor
'@maltty/bundler': minor
---

Renamed from `@kidd-cli/*` to `@maltty/*`.

This is a breaking change for any consumer importing from `@kidd-cli/*`. The old `@kidd-cli/*` packages will be archived and deprecated on npm with a pointer to the new packages.

**Migration is a find-and-replace:**

| Old | New |
|-----|-----|
| `@kidd-cli/core` | `@maltty/core` |
| `@kidd-cli/cli` | `@maltty/cli` |
| `@kidd-cli/config` | `@maltty/config` |
| `@kidd-cli/utils` | `@maltty/utils` |
| `@kidd-cli/bundler` | `@maltty/bundler` |

**Also renamed:**

- CLI binary: `kidd` → `maltty`
- Config files: `kidd.config.{ts,mts,json,yaml,toml}` → `maltty.config.{ts,mts,json,yaml,toml}`
- Env vars: `KIDD_*` → `MALTTY_*` (e.g. `KIDD_PUBLIC_*`, `KIDD_DEBUG`, `KIDD_VERSION`)
- Public API types: `Kidd*` → `Maltty*` (e.g. `KiddArgs` → `MalttyArgs`, `KiddStore` → `MalttyStore`, `KiddProvider` → `MalttyProvider`, `KiddContext` → `MalttyContext`, `KiddProviderProps` → `MalttyProviderProps`)
