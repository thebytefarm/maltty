import type { Key } from 'ink'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A parsed single-key pattern with optional modifier flags.
 */
export interface SingleKeyPattern {
  readonly type: 'single'
  readonly key: string
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
}

/**
 * A parsed multi-key sequence pattern (e.g. `'escape escape'`).
 */
export interface SequenceKeyPattern {
  readonly type: 'sequence'
  readonly steps: readonly SingleKeyPattern[]
}

/**
 * A parsed key pattern — either a single key or a sequence.
 */
export type ParsedKeyPattern = SingleKeyPattern | SequenceKeyPattern

/**
 * A normalized key event with the resolved key name and modifier flags.
 */
export interface NormalizedKeyEvent {
  readonly key: string
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maps Ink `Key` boolean field names to normalized key name strings.
 *
 * @private
 */
const INK_KEY_ENTRIES: readonly (readonly [string, string])[] = [
  ['upArrow', 'up'],
  ['downArrow', 'down'],
  ['leftArrow', 'left'],
  ['rightArrow', 'right'],
  ['pageUp', 'pageup'],
  ['pageDown', 'pagedown'],
  ['home', 'home'],
  ['end', 'end'],
  ['return', 'return'],
  ['escape', 'escape'],
  ['tab', 'tab'],
  ['backspace', 'backspace'],
  ['delete', 'delete'],
]

/**
 * Modifier key names used as prefixes in key patterns (e.g. `ctrl+c`).
 *
 * @private
 */
const MODIFIER_NAMES = new Set(['ctrl', 'meta', 'shift'])

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Normalize Ink's `(input, Key)` callback arguments into a single
 * {@link NormalizedKeyEvent} with a resolved key name string.
 *
 * Priority: special keys (from `Key` booleans) take precedence over
 * character input. Space is normalized to `'space'`.
 *
 * @param input - The raw character(s) from Ink's `useInput`.
 * @param key - The Ink `Key` object with boolean flags.
 * @returns A normalized key event.
 */
export function normalizeKey(input: string, key: Key): NormalizedKeyEvent {
  const specialKey = resolveSpecialKey(key)

  const resolvedKey = match(specialKey)
    .with(null, () =>
      match(input)
        .with(' ', () => 'space')
        .otherwise(() => input)
    )
    .otherwise((name) => name)

  return {
    key: resolvedKey,
    ctrl: key.ctrl,
    // Terminal escape (\x1b) doubles as the meta prefix — Clear the meta
    // Flag when the resolved key is 'escape' since it is protocol noise.
    meta: match(resolvedKey)
      .with('escape', () => false)
      .otherwise(() => key.meta),
    shift: key.shift,
  }
}

/**
 * Parse a declarative key pattern string into a structured
 * {@link ParsedKeyPattern}. Supports single keys (`'q'`), modifier
 * combinations (`'ctrl+c'`), and space-separated sequences
 * (`'escape escape'`).
 *
 * @param pattern - The key pattern string to parse.
 * @returns The parsed key pattern.
 */
export function parseKeyPattern(pattern: string): ParsedKeyPattern {
  const parts = pattern.split(' ')

  if (parts.length > 1) {
    return { type: 'sequence', steps: parts.map(parseSinglePattern) }
  }
  return parseSinglePattern(pattern)
}

/**
 * Check whether a {@link NormalizedKeyEvent} matches a
 * {@link SingleKeyPattern}. Compares the key name and all modifier flags.
 *
 * @param pattern - The parsed single-key pattern.
 * @param event - The normalized key event to test.
 * @returns `true` when the event matches the pattern.
 */
export function matchesSingleKey(pattern: SingleKeyPattern, event: NormalizedKeyEvent): boolean {
  return (
    pattern.key === event.key &&
    pattern.ctrl === event.ctrl &&
    pattern.meta === event.meta &&
    pattern.shift === event.shift
  )
}

/**
 * Check whether a sequence of recent {@link NormalizedKeyEvent}s matches a
 * {@link SequenceKeyPattern}. Compares the last N events (where N is the
 * number of steps) and verifies all timestamps fall within the timeout.
 *
 * @param pattern - The parsed sequence key pattern.
 * @param history - Recent key events with timestamps, newest last.
 * @param timeout - Maximum elapsed time in ms between first and last event.
 * @returns `true` when the history tail matches the full sequence within timeout.
 */
export function matchesSequence(
  pattern: SequenceKeyPattern,
  history: readonly (NormalizedKeyEvent & { readonly timestamp: number })[],
  timeout: number
): boolean {
  const stepCount = pattern.steps.length

  if (history.length < stepCount) {
    return false
  }

  const startIndex = history.length - stepCount
  const first = history[startIndex]
  const last = history.at(-1)

  if (first === undefined || last === undefined) {
    return false
  }

  const elapsed = last.timestamp - first.timestamp

  if (elapsed > timeout) {
    return false
  }

  return pattern.steps.every((step, index) => {
    const event = history[startIndex + index]
    if (event === undefined) {
      return false
    }
    return matchesSingleKey(step, event)
  })
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve the first active special key from an Ink `Key` object.
 * Returns `null` when no special key boolean is `true`.
 *
 * @private
 * @param key - The Ink Key object.
 * @returns The normalized key name, or null.
 */
function resolveSpecialKey(key: Key): string | null {
  const found = INK_KEY_ENTRIES.find(([field]) => key[field as keyof Key] === true)

  if (found === undefined) {
    return null
  }
  return found[1]
}

/**
 * Parse a single key pattern segment (no spaces). Handles modifier
 * prefixes like `ctrl+`, `meta+`, `shift+`.
 *
 * @private
 * @param segment - A single key pattern segment.
 * @returns The parsed single key pattern.
 */
function parseSinglePattern(segment: string): SingleKeyPattern {
  const parts = segment.split('+')
  const modifierList = new Set(parts.slice(0, -1).filter((p) => MODIFIER_NAMES.has(p)))
  const key = parts.at(-1) ?? segment

  return {
    type: 'single',
    key,
    ctrl: modifierList.has('ctrl'),
    meta: modifierList.has('meta'),
    shift: modifierList.has('shift'),
  }
}
