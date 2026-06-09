import { Box, Spacer, Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import type { ViewerMode } from '../hooks/use-panel-focus.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StatusBar} component.
 */
interface StatusBarProps {
  readonly mode: ViewerMode
  readonly hasSelection: boolean
  readonly isReloading: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Bottom status bar displaying mode indicator and context-sensitive
 * keyboard shortcut hints.
 *
 * @param props - The status bar props.
 * @returns A rendered status bar element.
 */
export function StatusBar({ mode, hasSelection, isReloading }: StatusBarProps): ReactElement {
  return (
    <Box paddingX={1} paddingTop={1}>
      <ModeIndicator mode={mode} />
      <Text> </Text>
      <Text dimColor>│</Text>
      <Text> </Text>
      {match({ isReloading, mode })
        .with({ isReloading: true }, () => (
          <Text bold color="yellow">
            Reloading...
          </Text>
        ))
        .with({ isReloading: false, mode: 'browse' }, () => (
          <BrowseHints hasSelection={hasSelection} />
        ))
        .with({ isReloading: false, mode: 'preview' }, () => <PreviewHints />)
        .with({ isReloading: false, mode: 'edit' }, () => <EditHints />)
        .with({ isReloading: false, mode: 'interactive' }, () => <InteractiveHints />)
        .exhaustive()}
      <Spacer />
      {match(mode)
        .with('browse', () => <QuitHint />)
        .with('preview', () => <QuitHint />)
        .otherwise(() => null)}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the mode indicator badge.
 *
 * @private
 * @param props - The mode indicator props.
 * @returns A rendered mode indicator element.
 */
function ModeIndicator({ mode }: { readonly mode: ViewerMode }): ReactElement {
  return (
    <Text
      bold
      color={match(mode)
        .with('browse', () => 'cyan' as const)
        .with('preview', () => 'blue' as const)
        .with('edit', () => 'yellow' as const)
        .with('interactive', () => 'green' as const)
        .exhaustive()}
    >
      {match(mode)
        .with('browse', () => '● Browse')
        .with('preview', () => '● Preview')
        .with('edit', () => '● Edit')
        .with('interactive', () => '● Interactive')
        .exhaustive()}
    </Text>
  )
}

/**
 * Render keyboard hints for browse mode.
 *
 * @private
 * @param props - The browse hints props.
 * @returns A rendered hints element.
 */
function BrowseHints({ hasSelection }: { readonly hasSelection: boolean }): ReactElement {
  return (
    <Box>
      <Text dimColor>↑↓</Text>
      <Text>: navigate</Text>
      <Text> </Text>
      <Text dimColor>enter</Text>
      <Text>: select/expand</Text>
      <Text> </Text>
      <Text dimColor>b</Text>
      <Text>: sidebar</Text>
      <Text> </Text>
      <Text dimColor>?</Text>
      <Text>: help</Text>
      {match(hasSelection)
        .with(true, () => (
          <Box>
            <Text> </Text>
            <Text dimColor>r</Text>
            <Text>: reset</Text>
          </Box>
        ))
        .with(false, () => null)
        .exhaustive()}
    </Box>
  )
}

/**
 * Render keyboard hints for preview mode.
 *
 * @private
 * @returns A rendered hints element.
 */
function PreviewHints(): ReactElement {
  return (
    <Box>
      <Text dimColor>enter</Text>
      <Text>: edit props</Text>
      <Text> </Text>
      <Text dimColor>i</Text>
      <Text>: interactive</Text>
      <Text> </Text>
      <Text dimColor>r</Text>
      <Text>: reset</Text>
      <Text> </Text>
      <Text dimColor>esc</Text>
      <Text>: back</Text>
      <Text> </Text>
      <Text dimColor>?</Text>
      <Text>: help</Text>
    </Box>
  )
}

/**
 * Render keyboard hints for edit mode.
 *
 * @private
 * @returns A rendered hints element.
 */
function EditHints(): ReactElement {
  return (
    <Box>
      <Text dimColor>tab/←→</Text>
      <Text>: prop</Text>
      <Text> </Text>
      <Text dimColor>esc</Text>
      <Text>: back</Text>
    </Box>
  )
}

/**
 * Render keyboard hints for interactive mode.
 *
 * @private
 * @returns A rendered hints element.
 */
function InteractiveHints(): ReactElement {
  return (
    <Box>
      <Text dimColor>esc esc</Text>
      <Text>: exit interactive</Text>
    </Box>
  )
}

/**
 * Render the quit shortcut hint.
 *
 * @private
 * @returns A rendered quit hint element.
 */
function QuitHint(): ReactElement {
  return (
    <Box>
      <Text dimColor>q</Text>
      <Text>: quit</Text>
    </Box>
  )
}
