import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { useSyncExternalStore } from 'react'
import { match } from 'ts-pattern'

import { formatCheck } from '@/lib/format/check.js'
import { formatFinding } from '@/lib/format/finding.js'
import { formatSummary } from '@/lib/format/tally.js'
import type { LogLevel, OutputEntry, SpinnerState } from '@/screen/output/types.js'
import { useOutputStore } from '@/screen/output/use-output-store.js'

import { Spinner } from './display/spinner.js'
import { colors, symbols } from './theme.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Render accumulated output entries and spinner state from the screen's
 * {@link OutputStore}.
 *
 * Automatically retrieves the store from the screen context provider.
 * Subscribes via `useSyncExternalStore` and re-renders whenever new
 * entries are pushed or spinner state changes.
 *
 * @returns A rendered output element.
 */
export function Output(): ReactElement {
  const store = useOutputStore()
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return (
    <Box flexDirection="column">
      <SpinnerRow state={snapshot.spinner} />
      {snapshot.entries.map((entry) => (
        <EntryRow key={`${entry.kind}-${String(entry.id)}`} entry={entry} />
      ))}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the spinner row based on current spinner state.
 *
 * @private
 */
function SpinnerRow({ state }: { readonly state: SpinnerState }): ReactElement | null {
  return match(state)
    .with({ status: 'idle' }, () => null)
    .with({ status: 'spinning' }, ({ message }) => <Spinner label={message} />)
    .with({ status: 'stopped' }, ({ message }) =>
      resolveTerminalIcon(message, colors.success, symbols.tick)
    )
    .with({ status: 'cancelled' }, ({ message }) =>
      resolveTerminalIcon(message, colors.warning, symbols.warning)
    )
    .with({ status: 'error' }, ({ message }) =>
      resolveTerminalIcon(message, colors.error, symbols.cross)
    )
    .exhaustive()
}

/**
 * Render a terminal-state spinner icon with a message, or null if the message is empty.
 *
 * @private
 */
function resolveTerminalIcon(message: string, color: string, icon: string): ReactElement | null {
  if (message.length === 0) {
    return null
  }
  return (
    <Text>
      <Text color={color}>{icon}</Text> {message}
    </Text>
  )
}

/**
 * Render a single output entry.
 *
 * @private
 */
function EntryRow({ entry }: { readonly entry: OutputEntry }): ReactElement {
  return match(entry)
    .with({ kind: 'log' }, (e) => <LogRow level={e.level} text={e.text} symbol={e.symbol} />)
    .with({ kind: 'raw' }, (e) => <Text>{e.text}</Text>)
    .with({ kind: 'newline' }, () => <Text> </Text>)
    .with({ kind: 'check' }, (e) => <Text>{formatCheck(e.input)}</Text>)
    .with({ kind: 'finding' }, (e) => <Text>{formatFinding(e.input)}</Text>)
    .with({ kind: 'summary' }, (e) => <Text>{formatSummary(e.input)}</Text>)
    .exhaustive()
}

/**
 * Render a log entry with the appropriate color and icon.
 *
 * @private
 */
function LogRow({
  level,
  text,
  symbol,
}: {
  readonly level: LogLevel
  readonly text: string
  readonly symbol?: string
}): ReactElement {
  return match(level)
    .with('info', () => (
      <Text>
        <Text color={colors.info}>{symbols.circle}</Text> {text}
      </Text>
    ))
    .with('success', () => (
      <Text>
        <Text color={colors.success}>{symbols.tick}</Text> {text}
      </Text>
    ))
    .with('error', () => (
      <Text>
        <Text color={colors.error}>{symbols.cross}</Text> {text}
      </Text>
    ))
    .with('warn', () => (
      <Text>
        <Text color={colors.warning}>{symbols.warning}</Text> {text}
      </Text>
    ))
    .with('step', () => (
      <Text>
        <Text color={colors.primary}>{symbols.circle}</Text> {text}
      </Text>
    ))
    .with('message', () => (
      <Text>
        {match(symbol)
          .with(undefined, () => '')
          .otherwise((s) => `${s} `)}
        {text}
      </Text>
    ))
    .exhaustive()
}
