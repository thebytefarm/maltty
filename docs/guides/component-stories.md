# Component Stories

Develop and preview Ink components in isolation using the maltty stories viewer -- a Storybook-like TUI that runs in the terminal.

## Overview

Stories let you render a component with predefined props, browse variants, and interactively edit props without wiring up a full command. This shortens the feedback loop when building screen-based commands.

## Prerequisites

- A maltty project with `maltty` and `@maltty/cli` installed
- One or more React/Ink components to preview

## Defining a story

Create a `.stories.tsx` file next to the component. Use the `story()` factory for a single story:

```tsx
import { story } from 'maltty/stories'
import { z } from 'zod'

import { Greeting } from './Greeting'

const schema = z.object({
  name: z.string().describe('Name to greet'),
  excited: z.boolean().describe('Whether to use an exclamation mark'),
})

export default story({
  name: 'Greeting',
  component: Greeting,
  schema,
  props: {
    name: 'World',
    excited: true,
  },
  description: 'A simple greeting component',
})
```

The `schema` drives the interactive props editor in the viewer. Each field's Zod type determines the control kind (text input, boolean toggle, enum select, etc.).

## Defining a story group

Use the `stories()` factory to define multiple variants that share a component and schema:

```tsx
import { stories } from 'maltty/stories'
import { z } from 'zod'

import { LogLevel } from './LogLevel'

const schema = z.object({
  level: z.enum(['info', 'warn', 'error']).describe('Log severity level'),
})

export default stories({
  title: 'LogLevel',
  component: LogLevel,
  schema,
  stories: {
    Info: {
      props: { level: 'info' },
      description: 'Informational message',
    },
    Warning: {
      props: { level: 'warn' },
      description: 'Warning message',
    },
    Error: {
      props: { level: 'error' },
      description: 'Error message',
    },
  },
})
```

Each key in the `stories` record becomes a selectable variant in the sidebar.

## Running the viewer

```bash
maltty stories
```

The viewer discovers all `.stories.tsx`, `.stories.ts`, `.stories.jsx`, and `.stories.js` files in the project. Use `--include` to narrow the search:

```bash
maltty stories --include "src/components/**/*.stories.tsx"
```

### Viewer features

- **Sidebar** -- browsable tree of all discovered stories and variants
- **Preview** -- live render of the selected story with current props
- **Props editor** -- edit props interactively with type-aware controls
- **Hot reload** -- file watcher detects changes and reloads stories automatically
- **Keyboard shortcuts** -- press `?` inside the viewer to see all shortcuts

## Decorators

Decorators wrap a story component to provide layout, context, or other rendering concerns. Apply them per-story or per-group:

```tsx
import { story, withLayout } from 'maltty/stories'

export default story({
  name: 'Padded Greeting',
  component: Greeting,
  schema,
  props: { name: 'World', excited: true },
  decorators: [withLayout({ padding: 1 })],
})
```

Built-in decorators:

| Decorator        | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `withLayout`     | Wrap in a Box with configurable padding/flex |
| `withFullScreen` | Render at full terminal dimensions           |
| `withContext`    | Provide maltty context (config, meta, store) |

## File conventions

- Story files use the `.stories.tsx` (or `.stories.ts`, `.stories.jsx`, `.stories.js`) suffix
- Place story files next to the component they describe
- Each story file has a single default export created by `story()` or `stories()`
- The Zod schema should mirror the component's props interface

## References

- [Screens](../concepts/screens.md)
- [CLI Reference](../reference/cli.md)
- [Components Standard](/contributing/standards/typescript/components.md)
