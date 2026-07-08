import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Placeholder displayed when no story is currently selected in the viewer.
 * Provides a hint to the user about how to browse stories.
 *
 * @returns A centered empty state element.
 */
export function EmptyState(): ReactElement {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Text dimColor>No story selected</Text>
      <Text dimColor>Use arrow keys to browse stories</Text>
    </Box>
  )
}
