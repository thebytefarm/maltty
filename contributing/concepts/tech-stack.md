# Tech Stack

Complete reference of tools and libraries used in the maltty CLI framework.

## Core Dependencies

### TypeScript & Build

| Tool                                         | Purpose                | Version | Documentation                                                                                |
| -------------------------------------------- | ---------------------- | ------- | -------------------------------------------------------------------------------------------- |
| [TypeScript](https://www.typescriptlang.org) | Type system            | ^5.x    | [Handbook](https://www.typescriptlang.org/docs/)                                             |
| [tsdown](https://tsdown.dev)                 | Bundler                | ^0.x    | [llms.txt](https://tsdown.dev/llms.txt) \| [llms-full.txt](https://tsdown.dev/llms-full.txt) |
| [pnpm](https://pnpm.io)                      | Package manager        | ^9.x    | [Docs](https://pnpm.io/motivation)                                                           |
| [Turbo](https://turbo.build)                 | Monorepo orchestration | ^2.x    | [Docs](https://turbo.build/repo/docs)                                                        |

### Functional Programming

| Tool                                                  | Purpose              | Critical Rules                                                                                       | Documentation                                     |
| ----------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [ts-pattern](https://github.com/gvergnaud/ts-pattern) | Pattern matching     | **Required** for all conditionals with 2+ branches. No `switch` statements allowed.                  | [GitHub](https://github.com/gvergnaud/ts-pattern) |
| [es-toolkit](https://es-toolkit.sh)                   | Functional utilities | **Check before implementing custom helpers.** Use `pipe`, `map`, `filter`, `reduce` from es-toolkit. | [GitHub](https://github.com/toss/es-toolkit)      |

### Validation & Types

| Tool                                                   | Purpose           | Critical Rules                                                        | Documentation                                       |
| ------------------------------------------------------ | ----------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| [Zod](https://zod.dev)                                 | Schema validation | **Required** at all boundaries (config, CLI args, API inputs).        | [llms-full.txt](https://zod.dev/llms-full.txt)      |
| [type-fest](https://github.com/sindresorhus/type-fest) | Type utilities    | Use for advanced type patterns (`DeepReadonly`, `PartialDeep`, etc.). | [GitHub](https://github.com/sindresorhus/type-fest) |

### CLI Framework

| Tool                                   | Purpose              | Usage                                                                  | Documentation                                    |
| -------------------------------------- | -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| [yargs](https://yargs.js.org)          | CLI argument parsing | Used in `packages/core` for argv parsing and command routing.          | [GitHub](https://github.com/yargs/yargs)         |
| [@clack/prompts](https://www.clack.cc) | CLI prompts & output | Used for interactive prompts, spinners, and formatted terminal output. | [GitHub](https://github.com/bombshell-dev/clack) |

### Testing

| Tool                         | Purpose           | Configuration                                                                                  | Documentation                                  |
| ---------------------------- | ----------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [Vitest](https://vitest.dev) | Testing framework | Workspace mode, unit tests colocated as `*.test.ts`, integration tests in `test/integration/`. | [GitHub](https://github.com/vitest-dev/vitest) |

### Linting & Formatting

| Tool                           | Purpose    | Configuration                                              | Documentation                       |
| ------------------------------ | ---------- | ---------------------------------------------------------- | ----------------------------------- |
| [OXC](https://oxc.rs) (oxlint) | Linting    | `.oxlintrc.json` with strict functional programming rules. | [llms.txt](https://oxc.rs/llms.txt) |
| [OXC](https://oxc.rs) (oxfmt)  | Formatting | `.oxfmtrc.json` for code formatting.                       | [llms.txt](https://oxc.rs/llms.txt) |

### Versioning & Publishing

| Tool                                                   | Purpose                | Usage                                                                                               | Documentation                                      |
| ------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Changesets](https://github.com/changesets/changesets) | Versioning & changelog | Run `pnpm changeset` to create changesets. GitHub Actions handles version bumps and npm publishing. | [GitHub](https://github.com/changesets/changesets) |

## AI & Code Review

| Tool                                    | Purpose             | Configuration                                               | Documentation                          |
| --------------------------------------- | ------------------- | ----------------------------------------------------------- | -------------------------------------- |
| [CodeRabbit](https://www.coderabbit.ai) | AI code review      | `.coderabbit.yaml` with functional programming enforcement. | [Docs](https://docs.coderabbit.ai)     |
| [Claude Code](https://claude.ai)        | AI coding assistant | `AGENTS.md` (source of truth), `CLAUDE.md` (symlink).       | [Anthropic](https://www.anthropic.com) |

## Design Rationale

### Why ts-pattern?

TypeScript's `switch` statements don't provide exhaustive type narrowing. `ts-pattern` gives us:

- Exhaustive matching enforced at compile time
- Type narrowing based on discriminated unions
- Expression-based (returns values, not statements)
- Cleaner syntax for complex conditionals

**Example:**

```typescript
import { match } from 'ts-pattern'

type Result<T, E> = { success: true; value: T } | { success: false; error: E }

const result = match(response)
  .with({ success: true }, ({ value }) => value)
  .with({ success: false }, ({ error }) => handleError(error))
  .exhaustive() // Compile error if cases missing
```

### Why es-toolkit?

Lodash is imperative and mutable. Ramda is powerful but has a steep learning curve. es-toolkit provides:

- Tree-shakeable ESM modules (smaller bundles)
- TypeScript-first design (better inference)
- Functional patterns without the Ramda complexity
- Modern ESNext features (uses native methods when available)

**Example:**

```typescript
import { pipe, map, filter, groupBy } from 'es-toolkit'

const result = pipe(
  users,
  filter((u) => u.active),
  map((u) => ({ ...u, name: u.name.toUpperCase() })),
  groupBy((u) => u.role)
)
```

### Why Zod?

Runtime validation is critical for config files, CLI arguments, and API boundaries. Zod provides:

- Static type inference from schemas (no duplication)
- Composable validators (`.refine()`, `.transform()`)
- Readable error messages
- Integration with Result types for error handling

**Example:**

```typescript
import { z } from 'zod'

const configSchema = z.object({
  apiUrl: z.string().url(),
  timeout: z.number().positive().default(5000),
})

type Config = z.infer<typeof configSchema> // Inferred type
```

### Why Vitest?

Jest is slow and requires heavy configuration. Vitest provides:

- Native ESM support (no transpilation needed)
- Blazing fast with Vite's transformation pipeline
- Compatible with Jest's API (easy migration)
- First-class TypeScript support
- Watch mode that actually works

### Why OXC?

ESLint is slow on large codebases. OXC (Oxidation Compiler) is:

- Written in Rust (50-100x faster than ESLint)
- Drop-in replacement for ESLint
- Better error messages
- Lower memory usage
- Active development by the Rspack team

## Version Requirements

| Requirement | Minimum Version | Reason                                                |
| ----------- | --------------- | ----------------------------------------------------- |
| Node.js     | 22.x            | Native ES2022 features, import.meta, top-level await  |
| pnpm        | 9.x             | Workspace protocol, catalog protocol, better lockfile |
| TypeScript  | 5.7.x           | `isolatedDeclarations`, improved type inference       |

## Excluded Technologies

These technologies are **not used** in this codebase:

| Technology | Reason for Exclusion                                            |
| ---------- | --------------------------------------------------------------- |
| Classes    | Violates functional programming persona. Use factory functions. |
| Lodash     | Imperative, mutable. Use es-toolkit.                            |
| Ramda      | Overly complex for this use case. Use es-toolkit.               |
| ESLint     | Too slow. Use oxlint.                                           |
| Prettier   | Use oxfmt (faster, Rust-based).                                 |
| Jest       | Too slow, poor ESM support. Use Vitest.                         |
| Babel      | Not needed with modern TypeScript + tsdown.                     |
| Webpack    | Use tsdown (faster, simpler).                                   |

## References

- [Architecture](./architecture.md) for how these tools fit together
- [TypeScript Coding Style](../standards/typescript/coding-style.md) for usage patterns
- [TypeScript Utilities](../standards/typescript/utilities.md) for es-toolkit patterns
