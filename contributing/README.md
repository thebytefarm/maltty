# Contributing

Welcome to the maltty contributing docs. This directory contains standards, templates, and guides for working in this codebase.

## How to Use

- **Standards** define the rules -- read the relevant standard before writing code or docs.
- **Concepts** explain the "what" and "why" behind key architectural decisions.
- **Guides** are step-by-step walkthroughs for common tasks.

## Table of Contents

### Standards

#### TypeScript

- [Naming](./standards/typescript/naming.md) -- File, variable, and property naming conventions
- [Functions](./standards/typescript/functions.md) -- Object parameters, JSDoc, pure functions
- [Design Patterns](./standards/typescript/design-patterns.md) -- Functional patterns, factories, composition
- [Coding Style](./standards/typescript/coding-style.md) -- Formatting, naming conventions, code organization
- [State](./standards/typescript/state.md) -- Immutability, state encapsulation, data flow
- [Conditionals](./standards/typescript/conditionals.md) -- ts-pattern, branching logic
- [Types](./standards/typescript/types.md) -- Discriminated unions, branded types, type patterns
- [Errors](./standards/typescript/errors.md) -- Result type, error handling
- [Utilities](./standards/typescript/utilities.md) -- es-toolkit reference
- [Testing](./standards/typescript/testing.md) -- Test structure, mocking, coverage

#### Git

- [Commits](./standards/git-commits.md) -- Commit message format and conventions
- [Pull Requests](./standards/git-pulls.md) -- PR creation, review, and merge process

#### Documentation

- [Writing](./standards/documentation/writing.md) -- Writing standards and templates
- [Formatting](./standards/documentation/formatting.md) -- Code examples, tables, markdown
- [Diagrams](./standards/documentation/diagrams.md) -- Mermaid diagram standards

### Concepts

- [Architecture](./concepts/architecture.md) -- Package ecosystem, system layers, context, data flow
- [CLI](./concepts/cli.md) -- Commands, middleware, context, autoloading, error flow

### Guides

- [Getting Started](./guides/getting-started.md) -- Local setup, reading order, Claude Code configuration
- [Developing a Feature](./guides/developing-a-feature.md) -- Branch, code, test, changeset, PR, merge
- [Adding a CLI Command](./guides/adding-a-cli-command.md) -- End-to-end walkthrough for new commands
