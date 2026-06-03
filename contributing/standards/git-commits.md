# Commit Standards

## Overview

All commits follow [Conventional Commits](https://www.conventionalcommits.org/) for a clear, structured history that enables automated versioning and changelog generation via Changesets. Every commit message must include a type, an optional scope, and a concise description in the imperative mood.

## Rules

### Follow Conventional Commits Format

Every commit message uses the format `type(scope): description`. The type indicates the category of change, the scope identifies the affected area, and the description starts with a lowercase verb in present tense.

| Type       | Description      | Usage                     |
| ---------- | ---------------- | ------------------------- |
| `feat`     | New feature      | User-facing functionality |
| `fix`      | Bug fix          | Fixes broken behavior     |
| `docs`     | Documentation    | Only doc changes          |
| `refactor` | Code refactoring | No behavior change        |
| `test`     | Add/update tests | Test files only           |
| `chore`    | Maintenance      | Build, deps, config       |
| `perf`     | Performance      | Optimization              |
| `security` | Security fix     | Vulnerability patches     |
| `release`  | Release          | Automated version bumps   |

#### Correct

```bash
git commit -m "feat(packages/core): add workspace script discovery"
git commit -m "fix(packages/core): resolve config loading from parent directories"
git commit -m "docs: add contributing guidelines"
git commit -m "chore(deps): update zod to 3.24.0"
```

#### Incorrect

```bash
# Missing type
git commit -m "add script discovery"

# Vague description
git commit -m "fix: fix bug"

# Past tense
git commit -m "feat(packages/core): added workspace support"
```

### Use Correct Scopes

Scopes identify what part of the codebase changed. Use directory-style paths for packages and short labels for cross-cutting concerns.

| Scope           | Description               |
| --------------- | ------------------------- |
| `packages/core` | The core maltty package   |
| `packages/cli`  | The CLI companion package |
| `deps`          | Dependency updates        |
| `ci`            | CI/CD workflow changes    |
| `repo`          | Workspace/monorepo config |

#### Correct

```bash
git commit -m "feat(packages/core): add parallel script execution"
git commit -m "chore(deps): update typescript to 5.7.0"
git commit -m "chore(ci): add security audit workflow"
git commit -m "chore(repo): update turbo.json pipeline"
```

### Mark Breaking Changes

Breaking changes must include `!` after the scope and a `BREAKING CHANGE:` footer. Mark as breaking when removing or renaming public APIs, changing config schema, or modifying CLI flags.

#### Correct

```bash
git commit -m "feat(packages/core)!: change config schema

BREAKING CHANGE: scripts field renamed from 'tasks' to 'scripts'"
```

### Include Body and Footer When Needed

Use the body to explain why the change was made and what problem it solves. Use the footer for issue references, co-authors, and breaking change descriptions.

#### Correct

```bash
git commit -m "refactor(packages/core): extract config resolution into lib/

Config loading logic was duplicated between init and run handlers.
This extracts it into a shared module for consistency.

Refs #42"
```

### Make Atomic Commits

Each commit should represent one logical change, build and pass checks independently, and be revertable without side effects.

#### Correct

```bash
git commit -m "feat(packages/core): add script tree display"
git commit -m "test(packages/core): add script tree tests"
git commit -m "docs: document script tree command"
```

#### Incorrect

```bash
# Multiple unrelated changes in one commit
git commit -m "feat: add script tree and fix config bug and update docs"
```

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)

## References

- [Git Pull Requests](./git-pulls.md)
