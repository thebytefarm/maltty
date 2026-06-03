# Introduction

maltty is an opinionated CLI framework for Node.js. It gives you typed commands, middleware pipelines, configuration loading, authentication, and terminal UI out of the box -- so you can focus on what your CLI does, not how it's wired together.

## Prerequisites

- **Node.js 24+** -- maltty targets the current LTS release
- **pnpm** (recommended) -- any package manager works, but maltty tooling assumes pnpm
- **TypeScript** -- maltty relies on Zod inference and module augmentation, so TypeScript is required

## Why maltty?

- **Convention over configuration** -- sensible defaults for commands, config discovery, and project layout
- **End-to-end type safety** -- Zod schemas for args and config, module augmentation for global types, typed context in every handler
- **Middleware pipelines** -- composable onion model for auth, logging, timing, and any cross-cutting concern
- **Built-in auth** -- OAuth PKCE, device code, env vars, file tokens, and interactive login with zero boilerplate
- **Terminal UI** -- logger, spinner, prompts, colors, and formatters all on `ctx`

## Project structure

A typical maltty project looks like this:

```
my-cli/
├── src/
│   ├── index.ts          # CLI entrypoint
│   ├── config.ts         # Config schema + module augmentation
│   ├── commands/
│   │   ├── deploy.ts     # Command definition
│   │   └── status.ts     # Command definition
│   └── middleware/
│       └── require-auth.ts
├── maltty.config.ts        # Build configuration
├── package.json
└── tsconfig.json
```

Commands live in `src/commands/`, middleware in `src/middleware/`, and the entrypoint ties them together with a single `cli()` call. The build configuration in `maltty.config.ts` controls how `@maltty/cli` bundles your project for distribution.

## Feature matrix

| Feature              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| Typed commands       | Zod schemas for args with full inference             |
| Middleware pipelines | Composable onion model for cross-cutting concerns    |
| Config discovery     | Automatic file loading with Zod validation           |
| Authentication       | OAuth PKCE, device code, env vars, file tokens       |
| Terminal UI          | Logger, spinner, prompts, colors, formatters         |
| HTTP client          | Typed fetch wrapper with auth header injection       |
| Icons                | Nerd Font glyphs with emoji fallback                 |
| Build & compile      | ESM bundling via tsdown, standalone binaries via Bun |

## Sub-exports

The `@maltty/core` package exposes focused sub-exports so you only import what you need:

| Export                 | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `@maltty/core`         | Commands, middleware, context, module augmentation |
| `@maltty/core/auth`    | Auth middleware and credential strategies          |
| `@maltty/core/http`    | HTTP client middleware                             |
| `@maltty/core/icons`   | Nerd Font icon middleware                          |
| `@maltty/core/config`  | Config client for loading outside cli()            |
| `@maltty/core/logger`  | Standalone terminal logger                         |
| `@maltty/core/store`   | File-backed JSON store                             |
| `@maltty/core/project` | Git root resolution and path utilities             |
| `@maltty/core/format`  | Standalone format functions                        |
| `@maltty/core/test`    | Test utilities for commands and middleware         |

## Packages

| Package                             | Description                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| [`@maltty/core`](/reference/maltty) | Commands, middleware, config, context, auth, HTTP, and icons |
| [`@maltty/cli`](/reference/cli)     | Scaffolding, building, diagnostics, and code generation      |

## Next steps

- [Quick Start](/getting-started/quick-start) -- build and run a CLI in 5 minutes
- [Build a CLI](/guides/build-a-cli) -- the full guide to commands, middleware, config, and sub-exports
- [Lifecycle](/concepts/lifecycle) -- how a CLI invocation flows from argv to exit
