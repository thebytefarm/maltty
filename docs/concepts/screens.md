# Screens

maltty supports two command authoring models: handler-based commands for sequential log-and-exit flows, and screen-based commands for interactive React/Ink terminal UIs. Screen commands replace the handler function with a React component that receives parsed args as props.

## Defining a screen

Use `screen()` from `@maltty/core/ui` to define a screen command. It takes a render component and optional options, just like `command()` takes a handler:

```ts
import { screen } from '@maltty/core/ui'
import { z } from 'zod'

export default screen({
  description: 'Run the deploy pipeline',
  options: z.object({
    target: z.string().default('staging').describe('Deployment target'),
  }),
  render: DeployPipeline,
})
```

See the [screen() reference](../reference/screen.md) for all available fields.

### Exit behavior

Screen commands support two exit modes:

- **`'manual'`** (default) -- the screen stays alive until the component calls `useApp().exit()` or the user presses Ctrl-C. Use for interactive dashboards and persistent TUIs.
- **`'auto'`** -- the runtime calls exit automatically once the component unmounts or the render tree settles. Use for status displays that render once and complete.

### Basic example (auto exit)

```tsx
import { Box, screen, Spinner, Text, useApp } from '@maltty/core/ui'
import React, { useEffect, useState } from 'react'
import { z } from 'zod'

function DeployPipeline({ target }: { readonly target: string }): React.ReactElement {
  const { exit } = useApp()
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDone(true)
      exit()
    }, 3000)
    return () => {
      clearTimeout(timer)
    }
  }, [exit])

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Deploy to {target}</Text>
      {done ? <Text color="green">Done!</Text> : <Spinner label="Deploying..." />}
    </Box>
  )
}

export default screen({
  description: 'Run the deploy pipeline',
  options: z.object({
    target: z.string().default('staging').describe('Deployment target'),
  }),
  render: DeployPipeline,
})
```

### Interactive example (manual exit)

```tsx
import { Box, screen, Select, Text, useApp, useInput } from '@maltty/core/ui'
import React, { useState } from 'react'

function Dashboard(): React.ReactElement {
  const { exit } = useApp()

  useInput((input) => {
    if (input === 'q') exit()
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Dashboard</Text>
      <Select
        options={[
          { label: 'Tasks', value: 'tasks' },
          { label: 'Logs', value: 'logs' },
          { label: 'Quit', value: 'quit' },
        ]}
        onChange={(value) => {
          if (value === 'quit') exit()
        }}
      />
    </Box>
  )
}

export default screen({
  description: 'Interactive dashboard',
  render: Dashboard,
})
```

## Context hooks

Inside screen components, runtime context is accessed via hooks instead of the `ctx` object. Hooks like `useConfig()`, `useMeta()`, `useStore()`, and `useApp()` replace the corresponding `ctx` properties.

These hooks are only available inside components rendered by `screen()`. They throw if used outside the MalttyProvider.

`ctx.log`, `ctx.prompts`, `ctx.status`, `ctx.colors`, and `ctx.format` are not available in screen components. Screen commands use React components and Ink primitives for all output.

See the [screen() reference](../reference/screen.md) for the full hooks and components API.

```tsx
import { Text, useConfig, useMeta } from '@maltty/core/ui'
import React from 'react'

function Status(): React.ReactElement {
  const config = useConfig<{ apiUrl: string }>()
  const meta = useMeta()
  return (
    <Text>
      {meta.name} v{meta.version} -- {config.apiUrl}
    </Text>
  )
}
```

## Middleware and screens

Screen commands skip the middleware pipeline entirely. When a command has a `render` property, the runtime invokes the render function directly instead of running middleware and then a handler.

This means middleware like `auth()`, `report()`, or custom middleware will not run for screen commands. If a screen needs authenticated data, fetch it inside the component or use a wrapper pattern.

## When to use screen() vs command()

| Use case                            | Approach                            |
| ----------------------------------- | ----------------------------------- |
| Sequential log output               | `command()` with handler            |
| One-shot prompts then exit          | `command()` with handler            |
| Interactive dashboard               | `screen()` with manual exit         |
| Progress pipeline with live updates | `screen()` with auto or manual exit |
| Selection UI with navigation        | `screen()` with manual exit         |
| Simple status display               | Either works                        |

## File conventions

- Use `.tsx` extension for files containing screen commands or React components.
- Use `.ts` extension for handler-only commands.
- Command-private components go in a `_components/` subdirectory (leading underscore prevents autoloader from treating them as commands).
- Name React components with PascalCase.
- Import all Ink primitives from `@maltty/core/ui`, never directly from `ink` or `@inkjs/ui`.

## Developing components with stories

maltty includes a Storybook-like TUI for developing and previewing screen components in isolation. Define `.stories.tsx` files alongside your components with `story()` or `stories()` from `@maltty/core/stories`, then run `maltty stories` to browse them with live preview and an interactive props editor.

## References

- [Context](./context.md)
- [Lifecycle](./lifecycle.md)
- [Build a CLI](../guides/build-a-cli.md)
- [screen() Reference](../reference/screen.md)
- [Core](../reference/maltty.md)
