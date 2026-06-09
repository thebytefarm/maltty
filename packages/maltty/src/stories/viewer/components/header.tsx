import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Header banner for the stories viewer TUI. Renders a book emoji
 * alongside a styled "Stories" title.
 *
 * @returns A rendered header element.
 */
export function Header(): ReactElement {
  return (
    <Box paddingX={1}>
      <Text>📚 </Text>
      <Text bold color="cyan">
        Stories
      </Text>
    </Box>
  )
}
