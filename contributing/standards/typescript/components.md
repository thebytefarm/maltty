# Components

## Overview

Standards for React/Ink components used in maltty CLI commands. Commands can use `screen()` from `maltty/ui` to build interactive terminal UIs with React components. These rules govern file conventions, component structure, colocation, and when to choose screen mode over handler mode.

## Rules

### Use `.tsx` for Files with JSX

Command files that contain JSX must use the `.tsx` extension. Files without JSX use `.ts`. The autoloader discovers both extensions.

#### Correct

```text
commands/
├── deploy.ts            # handler-only command
├── status.tsx           # screen command with JSX
└── dashboard/
    ├── index.tsx         # parent screen command
    └── _components/
        └── StatusTable.tsx
```

#### Incorrect

```text
commands/
├── status.ts            # contains JSX but uses .ts extension
```

### Name Components with PascalCase

All React function components use PascalCase names. This applies to both shared and command-private components.

#### Correct

```tsx
function StatusRow(props: StatusRowProps): React.ReactElement {
  return (
    <Box>
      <Text>{props.name}</Text>
    </Box>
  )
}
```

#### Incorrect

```tsx
function statusRow(props: StatusRowProps): React.ReactElement {
  return (
    <Box>
      <Text>{props.name}</Text>
    </Box>
  )
}
```

### Colocate Props Interfaces

Define props interfaces in the same file as the component. Use `readonly` on all properties. Name them `{ComponentName}Props`.

#### Correct

```tsx
interface StatusRowProps {
  readonly name: string
  readonly status: 'pass' | 'fail'
  readonly duration?: number
}

function StatusRow(props: StatusRowProps): React.ReactElement {
  return (
    <Box>
      <Text>{props.name}</Text>
    </Box>
  )
}
```

#### Incorrect

```tsx
// Props defined in a separate types.ts file for a single component
import type { StatusRowProps } from './types.js'
```

### Use `_components/` for Command-Private Components

Components used by a single command live in a `_components/` directory next to the command file. The leading underscore prevents the autoloader from treating them as commands.

#### Correct

```text
commands/
├── status.tsx
└── status/
    └── _components/
        ├── StatusTable.tsx
        └── StatusRow.tsx
```

### Use `src/ui/` for Shared Components

Components used by multiple commands live in `src/ui/`. Import them with the `@/` alias.

#### Correct

```text
src/
├── ui/
│   ├── Table.tsx
│   └── Spinner.tsx
└── commands/
    ├── status.tsx       # imports from @/ui/Table.tsx
    └── deploy.tsx       # imports from @/ui/Table.tsx
```

### Choose `screen()` for Interactive or Stateful UI

Use `screen()` when the command needs React state, hooks, dynamic updates, or complex layout. Use `command()` with a `handler` for sequential operations that log output and exit.

| Use `screen()` when                            | Use `command()` when             |
| ---------------------------------------------- | -------------------------------- |
| UI updates over time (spinners, progress)      | Sequential log-and-exit flow     |
| Interactive selection or input within the view | Simple prompts via `ctx.prompts` |
| Complex layout with multiple columns/sections  | Streaming text output            |
| React hooks manage async state                 | One-shot data fetch and display  |

#### Correct -- screen mode

```tsx
import { screen, Box, Text, useApp } from 'maltty/ui'

function Dashboard(): React.ReactElement {
  const { exit } = useApp()
  // ... interactive UI
  return (
    <Box>
      <Text>Dashboard</Text>
    </Box>
  )
}

export default screen({
  description: 'Show live dashboard',
  render: Dashboard,
})
```

#### Correct -- handler mode

```ts
import { command } from 'maltty'

export default command({
  description: 'Deploy the application',
  handler(ctx) {
    ctx.spinner.start('Deploying...')
    // ... deploy logic
    ctx.spinner.stop('Deployed')
  },
})
```

### The `screen()` Factory Owns the Lifecycle

The `screen()` factory handles Ink rendering, the `MalttyProvider`, and exit behavior. The component receives parsed args as props. Runtime context (config, meta, store) is available via hooks.

```tsx
import { screen, useConfig, useMeta } from 'maltty/ui'

function StatusView({ env }: { readonly env: string }): React.ReactElement {
  const config = useConfig()
  const meta = useMeta()
  // ... render UI using args (env), config, and meta
}

export default screen({
  description: 'Interactive status view',
  options: z.object({
    env: z.string().default('staging').describe('Target environment'),
  }),
  render: StatusView,
})
```

Available hooks inside screen components:

| Hook          | Returns             | Description                     |
| ------------- | ------------------- | ------------------------------- |
| `useConfig()` | `Readonly<TConfig>` | Validated CLI config            |
| `useMeta()`   | `Readonly<Meta>`    | CLI name, version, command path |
| `useStore()`  | `Store`             | In-memory key-value store       |
| `useApp()`    | `{ exit }`          | Ink app control (from `ink`)    |

### Exit Behavior

Screens default to `'manual'` exit — the component stays alive until `useApp().exit()` is called or the user presses Ctrl-C. Use `exit: 'auto'` for screens that render once and exit.

```tsx
// Manual exit (default) — stays alive until explicit exit
export default screen({
  description: 'Interactive dashboard',
  render: Dashboard,
})

// Auto exit — renders once and exits
export default screen({
  description: 'Show status summary',
  exit: 'auto',
  render: StatusSummary,
})
```

### No `let` at Module Level

The `no let` rule still applies at module level in `.tsx` files. Inside React components, `useState` and other hooks manage mutable state -- this is the expected pattern for component-local state.

#### Correct

```tsx
const REFRESH_INTERVAL = 5000

function Dashboard(props: DashboardProps): React.ReactElement {
  const [status, setStatus] = useState<Status>('idle')
  // ...
}
```

#### Incorrect

```tsx
let refreshInterval = 5000 // module-level let is banned

function Dashboard(props: DashboardProps): React.ReactElement {
  // ...
}
```

### Use Ink Primitives from `maltty/ui`

Import all Ink primitives and `@inkjs/ui` components from `maltty/ui`. Do not import from `ink` or `@inkjs/ui` directly.

#### Correct

```tsx
import { Box, Text, Spinner, useApp } from 'maltty/ui'

function StatusRow(props: StatusRowProps): React.ReactElement {
  return (
    <Box gap={1}>
      <Text color="green">{props.name}</Text>
      <Text dimColor>{props.detail}</Text>
    </Box>
  )
}
```

#### Incorrect

```tsx
import { Box, Text } from 'ink' // direct ink import
import { Spinner } from '@inkjs/ui' // direct @inkjs/ui import

function StatusRow(props: StatusRowProps): React.ReactElement {
  console.log(`${props.name}: ${props.detail}`)
  return <></>
}
```

## Resources

- [Ink](https://github.com/vadimdemedes/ink)
- [React](https://react.dev)

## References

- [Coding Style](./coding-style.md) -- Constraints (no classes, no let, no throw, etc.)
- [Design Patterns](./design-patterns.md) -- Factories, pipelines, composition
- [Naming](./naming.md) -- Naming conventions
