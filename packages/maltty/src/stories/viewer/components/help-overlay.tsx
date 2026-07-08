import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BROWSE_SHORTCUTS = [
  { key: 'Up/Down', description: 'Navigate story tree' },
  { key: 'Enter', description: 'Select story' },
  { key: 'b', description: 'Toggle sidebar' },
  { key: 'r', description: 'Reset props to defaults' },
  { key: '?', description: 'Toggle help' },
  { key: 'q', description: 'Quit' },
] as const

const PREVIEW_SHORTCUTS = [
  { key: 'Enter', description: 'Edit props' },
  { key: 'i', description: 'Enter interactive mode' },
  { key: 'r', description: 'Reset props to defaults' },
  { key: 'b', description: 'Toggle sidebar' },
  { key: 'Esc', description: 'Back to browse' },
  { key: '?', description: 'Toggle help' },
  { key: 'q', description: 'Quit' },
] as const

const EDIT_SHORTCUTS = [
  { key: 'Tab', description: 'Cycle to next prop' },
  { key: 'Left/Right', description: 'Switch between prop fields' },
  { key: 'Esc', description: 'Back to preview' },
] as const

const INTERACTIVE_SHORTCUTS = [{ key: 'Esc Esc', description: 'Exit interactive mode' }] as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link HelpOverlay} component.
 */
interface HelpOverlayProps {
  readonly onClose: () => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Modal overlay displaying available keyboard shortcuts for both
 * browse and edit modes. Closes when the user presses `?` or `q`.
 *
 * @param props - The help overlay props.
 * @returns A rendered help overlay element.
 */
export function HelpOverlay({ onClose }: HelpOverlayProps): ReactElement {
  useInput((input) => {
    if (input === '?' || input === 'q') {
      onClose()
    }
  })

  return (
    <Box flexDirection="column" borderStyle="double" padding={1}>
      <Text bold>Keyboard Shortcuts</Text>
      <Text> </Text>
      <Text bold color="cyan">
        Browse Mode
      </Text>
      {BROWSE_SHORTCUTS.map((shortcut) => (
        <Box key={shortcut.key} gap={2}>
          <Box width={12}>
            <Text color="cyan">{shortcut.key}</Text>
          </Box>
          <Text>{shortcut.description}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text bold color="blue">
        Preview Mode
      </Text>
      {PREVIEW_SHORTCUTS.map((shortcut) => (
        <Box key={shortcut.key} gap={2}>
          <Box width={12}>
            <Text color="cyan">{shortcut.key}</Text>
          </Box>
          <Text>{shortcut.description}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text bold color="yellow">
        Edit Mode
      </Text>
      {EDIT_SHORTCUTS.map((shortcut) => (
        <Box key={shortcut.key} gap={2}>
          <Box width={12}>
            <Text color="cyan">{shortcut.key}</Text>
          </Box>
          <Text>{shortcut.description}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text bold color="green">
        Interactive Mode
      </Text>
      {INTERACTIVE_SHORTCUTS.map((shortcut) => (
        <Box key={shortcut.key} gap={2}>
          <Box width={12}>
            <Text color="cyan">{shortcut.key}</Text>
          </Box>
          <Text>{shortcut.description}</Text>
        </Box>
      ))}
    </Box>
  )
}
