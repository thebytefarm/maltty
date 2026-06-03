# Get Started Contributing

Set up your local environment to contribute to maltty.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22.0.0
- [pnpm](https://pnpm.io/) 10.x (`corepack enable` to activate)
- [Git](https://git-scm.com/)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (optional but recommended)

## Steps

### 1. Fork and clone

```bash
gh repo fork thebytefarm/maltty --clone
cd maltty
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Verify the build

Run the full CI check suite to confirm everything works:

```bash
pnpm lint && pnpm format && pnpm typecheck
```

### 4. Run tests

```bash
pnpm test
```

### 5. Understand the project

Read the project docs in this order:

1. [`CLAUDE.md`](https://github.com/thebytefarm/maltty/blob/main/CLAUDE.md) -- tech stack, project structure, available commands
2. [`contributing/concepts/architecture.md`](../concepts/architecture.md) -- system layers, packages, and data flow
3. [`contributing/concepts/cli.md`](../concepts/cli.md) -- commands, context, middleware, and error flow
4. Relevant standards in [`contributing/standards/`](../standards/) as needed

### 6. Set up Claude Code (optional)

The repo includes built-in configuration for Claude Code:

| File                          | Purpose                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `CLAUDE.md`                   | Persona, project structure, tech stack, and commands                         |
| `.claude/settings.json`       | PostToolUse hooks that auto-format and lint TypeScript files on save         |
| `.claude/rules/typescript.md` | Functional programming rules Claude follows for all `packages/**/*.ts` files |

## Verification

Confirm all checks pass:

```bash
pnpm lint && pnpm format && pnpm typecheck
pnpm test
```

## Troubleshooting

### pnpm not found

**Issue:** Running `pnpm` returns "command not found."

**Fix:**

```bash
corepack enable
```

### Lockfile mismatch after switching branches

**Issue:** Build or install fails after checking out a different branch.

**Fix:**

```bash
pnpm install
```

### Lefthook hooks fail on commit or push

**Issue:** Git hooks block your commit or push with lint/format/typecheck errors.

**Fix:** Fix the reported issues and re-commit. The hooks run automatically via [Lefthook](https://github.com/evilmartians/lefthook) -- see `lefthook.yml` for the full hook configuration.

## References

- [Architecture](../concepts/architecture.md)
- [CONTRIBUTING.md](https://github.com/thebytefarm/maltty/blob/main/CONTRIBUTING.md)
- [CLAUDE.md](https://github.com/thebytefarm/maltty/blob/main/CLAUDE.md)
