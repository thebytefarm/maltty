# @maltty/tui

Standalone React and Ink components for terminal user interfaces. The package has no dependency on
the maltty runtime or `@maltty/stories`.

```bash
pnpm add @maltty/tui ink react
```

Import the complete API from the package root:

```tsx
import { Box, Spinner, Text } from '@maltty/tui'
import type { ReactElement } from 'react'

export function Loading(): ReactElement {
  return (
    <Box gap={1}>
      <Spinner />
      <Text>Loading</Text>
    </Box>
  )
}
```

Use component subpaths when only one feature is needed:

```tsx
import { Spinner } from '@maltty/tui/spinner'
```

Existing applications can continue importing the same components from `maltty/ui`. That facade also
contains the maltty-owned screen and output APIs.
