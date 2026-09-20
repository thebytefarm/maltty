import type { Key } from 'ink'
import { useInput } from 'ink'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { match } from 'ts-pattern'

import type { NormalizedKeyEvent, ParsedKeyPattern } from './keys.js'
import { matchesSequence, matchesSingleKey, normalizeKey, parseKeyPattern } from './keys.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default timeout in ms for multi-key sequences.
 */
const DEFAULT_SEQUENCE_TIMEOUT = 600

/**
 * Minimum key history entries retained for sequence matching.
 */
const MIN_HISTORY_LENGTH = 10

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Arguments for the {@link useHotkey} hook.
 *
 * Each call binds one action to one or more key patterns. Use multiple
 * `useHotkey` calls for independent actions.
 */
export interface UseHotkeyArgs {
  /**
   * Key patterns that trigger the action (e.g. `['q']`, `['escape escape']`).
   */
  readonly keys: readonly string[]
  /**
   * Callback invoked when any pattern matches.
   */
  readonly action: () => void
  /**
   * Whether the binding is active. Defaults to `true`.
   */
  readonly active?: boolean
  /**
   * Timeout in ms for multi-key sequences. Defaults to `600`.
   */
  readonly sequenceTimeout?: number
}

/**
 * A key history entry with timestamp for sequence matching.
 *
 * @private
 */
interface KeyHistoryEntry extends NormalizedKeyEvent {
  readonly timestamp: number
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Bind one or more key patterns to a single action. Supports single keys
 * (`'q'`), modifier combinations (`'ctrl+c'`), and space-separated
 * sequences (`'escape escape'`). Use multiple `useHotkey` calls for
 * independent actions.
 *
 * @param args - Key patterns, action callback, and optional configuration.
 * @returns Nothing.
 */
export function useHotkey({
  keys,
  action,
  active = true,
  sequenceTimeout = DEFAULT_SEQUENCE_TIMEOUT,
}: UseHotkeyArgs): void {
  const historyRef = useRef<KeyHistoryEntry[]>([])
  const actionRef = useRef(action)
  const activeRef = useRef(active)
  const keysKey = keys.join('\0')

  useEffect(() => {
    actionRef.current = action
  })

  activeRef.current = active

  const parsedPatterns = useMemo<readonly ParsedKeyPattern[]>(
    () => keys.map(parseKeyPattern),
    [keysKey] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const maxHistory = useMemo(() => resolveMaxHistory(parsedPatterns), [parsedPatterns])

  const inputHandler = useCallback(
    (input: string, key: Key) => {
      const normalized = normalizeKey(input, key)
      const entry: KeyHistoryEntry = { ...normalized, timestamp: Date.now() }

      // Always record — sequences must build up even before activation.
      historyRef.current = [...historyRef.current.slice(-(maxHistory - 1)), entry]

      // Only fire the action when the binding is active.
      if (!activeRef.current) {
        return
      }

      const matched = parsedPatterns.some((pattern) =>
        checkBinding(pattern, normalized, historyRef.current, sequenceTimeout)
      )

      if (matched) {
        actionRef.current()
      }
    },
    [parsedPatterns, sequenceTimeout, maxHistory]
  )

  // Always listening — history records all keys, active gates the action.
  useInput(inputHandler)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Derive the history buffer size from the longest sequence binding.
 *
 * Returns at least {@link MIN_HISTORY_LENGTH} so the buffer is never
 * smaller than a reasonable default, even when no sequence bindings
 * are registered.
 *
 * @private
 * @param patterns - The parsed key patterns from all bindings.
 * @returns The required history length.
 */
function resolveMaxHistory(patterns: readonly ParsedKeyPattern[]): number {
  const longest = patterns.reduce((max, p) => Math.max(max, resolvePatternLength(p)), 0)
  return Math.max(longest, MIN_HISTORY_LENGTH)
}

/**
 * Get the effective length of a parsed key pattern.
 *
 * @private
 * @param pattern - The parsed key pattern.
 * @returns The number of key events the pattern requires.
 */
function resolvePatternLength(pattern: ParsedKeyPattern): number {
  return match(pattern)
    .with({ type: 'single' }, () => 1)
    .with({ type: 'sequence' }, (p) => p.steps.length)
    .exhaustive()
}

/**
 * Check whether a normalized key event (and recent history) matches a
 * parsed key pattern.
 *
 * @private
 * @param pattern - The parsed key pattern to check.
 * @param event - The current normalized key event.
 * @param history - Recent key history entries with timestamps.
 * @param timeout - Sequence timeout in ms.
 * @returns `true` when the event matches the pattern.
 */
function checkBinding(
  pattern: ParsedKeyPattern,
  event: NormalizedKeyEvent,
  history: readonly KeyHistoryEntry[],
  timeout: number
): boolean {
  return match(pattern)
    .with({ type: 'single' }, (p) => matchesSingleKey(p, event))
    .with({ type: 'sequence' }, (p) => matchesSequence(p, history, timeout))
    .exhaustive()
}
