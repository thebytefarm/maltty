# Add a CLI Command

Add a new command to the maltty CLI end-to-end: handler, registration, and verification.

## Prerequisites

- Familiarity with the [CLI concepts](../concepts/cli.md) and [architecture](../concepts/architecture.md)
- The project builds successfully (`pnpm typecheck`)

## Steps

### 1. Create the command file

Create a new file in the commands directory. The filename becomes the command name (e.g., `check.ts` registers as the `check` command).

**With Zod args:**

```ts
import { command } from '@maltty/core'
import { z } from 'zod'

export default command({
  description: 'Validate all scripts can be imported',
  args: z.object({
    fix: z.boolean().optional(),
  }),
  handler: async (ctx) => {
    ctx.spinner.start('Validating scripts')

    if (ctx.args.fix) {
      ctx.log.raw('Running with auto-fix enabled')
    }

    ctx.spinner.stop('Validation complete')
  },
})
```

**Without args:**

```ts
import { command } from '@maltty/core'

export default command({
  description: 'List available scripts',
  handler: async (ctx) => {
    process.stdout.write(ctx.format.table(scripts))
  },
})
```

**Hidden or deprecated:**

Commands can be hidden from `--help` output or marked as deprecated. Both `hidden` and `deprecated` accept a static value or a function (`Resolvable<T>`), resolved at registration time.

```ts
import { command } from '@maltty/core'

// Hidden from help, still executable via `mycli debug`
export default command({
  description: 'Internal debugging tools',
  hidden: true,
  handler: async (ctx) => {
    /* ... */
  },
})

// Deprecated with message
export default command({
  description: 'Deploy (legacy)',
  deprecated: 'Use "deploy-v2" instead',
  handler: async (ctx) => {
    /* ... */
  },
})
```

Individual flags also support `hidden`, `deprecated`, and `group`:

```ts
export default command({
  description: 'Build the project',
  options: {
    trace: { type: 'boolean', description: 'Enable tracing', hidden: true },
    format: { type: 'string', description: 'Output format', group: 'Output Options:' },
    legacy: { type: 'boolean', description: 'Legacy mode', deprecated: 'Use --modern' },
  },
  handler: async (ctx) => {
    /* ... */
  },
})
```

**With subcommands:**

Create a directory with an `index.ts` for the parent command and individual files for each subcommand:

```
commands/
└── auth/
    ├── index.ts         # Parent command (optional handler)
    ├── login.ts         # "auth login" subcommand
    └── logout.ts        # "auth logout" subcommand
```

```ts
import { command, autoload } from '@maltty/core'

export default command({
  description: 'Auth commands',
  commands: autoload({ dir: './auth' }),
})
```

**With render mode (`.tsx`):**

Commands that need React/Ink UI use a `render` function instead of `handler`. The file must use the `.tsx` extension.

```tsx
import { render } from 'ink'
import { command } from '@maltty/core'

import { StatusView } from './_components/StatusView.js'

export default command({
  description: 'Show live status dashboard',
  render(props) {
    const { waitUntilExit } = render(<StatusView {...props} />)
    return waitUntilExit()
  },
})
```

The `render` function receives `RenderProps` (with `args`, `config`, `meta`, `store`, `colors`) and owns the full Ink lifecycle. Place command-private components in a `_components/` directory next to the command file. See the [Components standard](../standards/typescript/components.md) for full conventions.

### 2. Register the command

Commands are auto-registered via the autoloader when placed in the commands directory. The autoloader discovers files that:

- Have a `.ts`, `.tsx`, or `.js` extension (not `.d.ts`)
- Do not start with `_` or `.`
- Export a default `Command` object (created by the `command()` factory)

No manual registration is needed.

### 3. Add lib functions if needed

If the command needs new shared logic, add it to `packages/core/src/lib/`. Follow existing patterns:

- Return `Result` tuples for operations that can fail
- Use Zod for runtime validation at boundaries
- Keep functions pure where possible

### 4. Write tests

Create `*.test.ts` files in the `test/` directory following the existing structure. Test the handler directly by constructing a mock context:

- Test the success path with valid args
- Test each failure path with expected errors
- Test Zod validation rejects invalid inputs

### 5. Verify

Run the full CI check suite:

```bash
pnpm lint && pnpm format && pnpm typecheck
```

## Verification

After completing all steps:

1. Run `pnpm typecheck` and confirm no errors
2. Run `pnpm test` and confirm all tests pass
3. Run `pnpm maltty <name> --help` and confirm the command appears
4. Run the command and verify the expected behavior

## Troubleshooting

### Command not appearing in help

**Issue:** The new command does not show up in `maltty --help`.

**Fix:** Ensure the file is in the commands directory, has a `.ts` or `.js` extension, does not start with `_` or `.`, and exports a default `Command` created by the `command()` factory.

### Zod validation fails at runtime

**Issue:** The handler receives a validation error for a valid-looking input.

**Fix:** Verify the Zod schema matches the expected args shape. Args are validated against the schema before the handler runs. Check that optional fields use `.optional()` and defaults use `.default()`.

### Handler not receiving expected context

**Issue:** Properties on `ctx` are missing or mistyped.

**Fix:** Verify the command uses `command()` from `@maltty/core` (not a custom wrapper). Check that module augmentation interfaces (`MalttyArgs`, `CliConfig`, `MalttyStore`) are correctly declared if using typed store keys or global args.

## References

- [CLI](../concepts/cli.md)
- [Architecture](../concepts/architecture.md)
- [Coding Style](../standards/typescript/coding-style.md)
- [Errors](../standards/typescript/errors.md)
