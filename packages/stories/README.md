# @maltty/stories

Framework-independent component story definitions, discovery, validation, and registries for React
and Ink applications. The package does not depend on the maltty CLI runtime or maltty UI components.

```tsx
import { story } from '@maltty/stories'
import { Text } from 'ink'
import type { ReactElement } from 'react'
import { z } from 'zod'

interface GreetingProps {
  readonly name: string
}

function Greeting({ name }: GreetingProps): ReactElement {
  return <Text>Hello, {name}.</Text>
}

export default story({
  name: 'Greeting',
  component: Greeting,
  schema: z.object({
    name: z.string(),
  }),
  props: {
    name: 'Maltty',
  },
})
```

Install `jiti` to use story discovery and watch mode. The interactive Ink viewer remains available
through `maltty/stories` while the reusable TUI primitives are extracted from the maltty runtime.
