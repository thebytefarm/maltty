import { match } from 'ts-pattern'

const SGR_MOUSE_PATTERN = /^\[<(?<code>\d+);(?<column>\d+);(?<row>\d+)(?<suffix>[Mm])$/u

/**
 * Mouse buttons represented by the SGR mouse protocol.
 */
export type SgrMouseButton = 'left' | 'middle' | 'right' | 'none'

/**
 * Pointer event phases normalized from SGR mouse input.
 */
export type SgrMouseEventType = 'down' | 'up' | 'move' | 'drag' | 'scroll'

/**
 * Scroll directions represented by SGR wheel button codes.
 */
export type SgrMouseScrollDirection = 'up' | 'down' | 'left' | 'right'

/**
 * Keyboard modifiers attached to a pointer event.
 */
export interface SgrMouseModifiers {
  readonly alt: boolean
  readonly ctrl: boolean
  readonly shift: boolean
}

/**
 * Scroll metadata attached to wheel events.
 */
export interface SgrMouseScroll {
  readonly delta: number
  readonly direction: SgrMouseScrollDirection
}

/**
 * A normalized, zero-based pointer event parsed from SGR terminal input.
 */
export interface SgrMouseEvent {
  readonly button: SgrMouseButton
  readonly modifiers: SgrMouseModifiers
  readonly scroll?: SgrMouseScroll
  readonly type: SgrMouseEventType
  readonly x: number
  readonly y: number
}

/**
 * A predictable SGR mouse parsing failure.
 */
export interface SgrMouseParseError {
  readonly input: string
  readonly message: string
  readonly type: 'invalid_sequence' | 'invalid_code' | 'invalid_coordinates'
}

/**
 * Result returned by {@link parseSgrMouse}.
 */
export type SgrMouseParseResult =
  | readonly [SgrMouseParseError, null]
  | readonly [null, SgrMouseEvent]

/**
 * Parse one complete SGR mouse sequence into a normalized pointer event.
 *
 * Ink buffers fragmented CSI input before invoking `useInput`, and removes
 * the leading escape byte. This parser accepts both Ink's value and the raw
 * terminal sequence, including its 8-bit CSI form, so the pure protocol logic
 * can also be reused at a lower input boundary.
 *
 * @param input - Complete SGR mouse sequence in Ink, 7-bit CSI, or 8-bit CSI form.
 * @returns An error-first result containing a zero-based pointer event.
 */
export function parseSgrMouse(input: string): SgrMouseParseResult {
  const parsed = SGR_MOUSE_PATTERN.exec(removeEscapePrefix(input))
  if (parsed === null) {
    return [createParseError({ input, type: 'invalid_sequence' }), null]
  }

  const rawCode = parsed.groups?.['code']
  const rawColumn = parsed.groups?.['column']
  const rawRow = parsed.groups?.['row']
  const suffix = parsed.groups?.['suffix']

  if (
    rawCode === undefined ||
    rawColumn === undefined ||
    rawRow === undefined ||
    (suffix !== 'M' && suffix !== 'm')
  ) {
    return [createParseError({ input, type: 'invalid_sequence' }), null]
  }

  const code = Number(rawCode)
  if (!isValidCode({ code, suffix })) {
    return [createParseError({ input, type: 'invalid_code' }), null]
  }

  const column = Number(rawColumn)
  const row = Number(rawRow)
  if (!isValidCoordinate(column) || !isValidCoordinate(row)) {
    return [createParseError({ input, type: 'invalid_coordinates' }), null]
  }

  const decodedButton = resolveButton(code)
  const type = resolveEventType({ button: decodedButton, code, suffix })
  const button = resolveEventButton({ button: decodedButton, type })
  const scroll = resolveScroll({ code, type })

  const event = Object.freeze({
    button,
    modifiers: Object.freeze({
      alt: (code & 8) !== 0,
      ctrl: (code & 16) !== 0,
      shift: (code & 4) !== 0,
    }),
    type,
    x: column - 1,
    y: row - 1,
  })
  if (scroll === undefined) {
    return [null, event]
  }
  return [null, Object.freeze({ ...event, scroll })]
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * @private
 */
interface CreateParseErrorOptions {
  readonly input: string
  readonly type: SgrMouseParseError['type']
}

/**
 * @private
 */
interface ResolveEventButtonOptions {
  readonly button: SgrMouseButton
  readonly type: SgrMouseEventType
}

/**
 * @private
 */
interface ResolveEventTypeOptions {
  readonly button: SgrMouseButton
  readonly code: number
  readonly suffix: 'M' | 'm'
}

/**
 * @private
 */
interface ResolveScrollOptions {
  readonly code: number
  readonly type: SgrMouseEventType
}

/**
 * Build a stable parser error without exposing regex details.
 *
 * @private
 * @param options - Invalid input and its failure category.
 * @returns A frozen parser error.
 */
function createParseError({ input, type }: CreateParseErrorOptions): SgrMouseParseError {
  const message = match(type)
    .with('invalid_sequence', () => 'Input is not a complete SGR mouse sequence')
    .with('invalid_code', () => 'Mouse button code exceeds the safe integer range')
    .with('invalid_coordinates', () => 'Mouse coordinates must be positive safe integers')
    .exhaustive()

  return Object.freeze({ input, message, type })
}

/**
 * Validate the one-based coordinate fields emitted by terminals.
 *
 * @private
 * @param coordinate - Parsed terminal row or column.
 * @returns Whether the coordinate can be normalized safely.
 */
function isValidCoordinate(coordinate: number): boolean {
  return Number.isSafeInteger(coordinate) && coordinate > 0
}

/**
 * Reject unsupported extended buttons and contradictory SGR bit fields.
 *
 * @private
 * @param options - Parsed button code and event suffix.
 * @returns Whether the code is representable by the public event model.
 */
function isValidCode({
  code,
  suffix,
}: {
  readonly code: number
  readonly suffix: 'M' | 'm'
}): boolean {
  if (!Number.isSafeInteger(code) || code < 0 || code > 95) {
    return false
  }

  const isMotion = (code & 32) !== 0
  const isScroll = (code & 64) !== 0
  const isButtonless = (code & 3) === 3

  if (isMotion && isScroll) {
    return false
  }
  if (suffix === 'm' && (isMotion || isScroll)) {
    return false
  }
  if (suffix === 'M' && !isMotion && !isScroll && isButtonless) {
    return false
  }
  return true
}

/**
 * Normalize raw terminal input to the value Ink passes to `useInput`.
 *
 * @private
 * @param input - Raw terminal input or an Ink input value.
 * @returns Input normalized to Ink's leading `[` form.
 */
function removeEscapePrefix(input: string): string {
  return match(input)
    .when(
      (value) => value.startsWith('\u001B'),
      (value) => value.slice(1)
    )
    .when(
      (value) => value.startsWith('\u009B'),
      (value) => `[${value.slice(1)}`
    )
    .otherwise((value) => value)
}

/**
 * Decode the low button bits from an SGR code.
 *
 * @private
 * @param code - SGR button and modifier bit field.
 * @returns The decoded button.
 */
function resolveButton(code: number): SgrMouseButton {
  return match(code & 3)
    .with(0, () => 'left' as const)
    .with(1, () => 'middle' as const)
    .with(2, () => 'right' as const)
    .otherwise(() => 'none' as const)
}

/**
 * Wheel events are not associated with a held pointer button.
 *
 * @private
 * @param options - Decoded button and normalized event type.
 * @returns The event's public button value.
 */
function resolveEventButton({ button, type }: ResolveEventButtonOptions): SgrMouseButton {
  if (type === 'scroll') {
    return 'none'
  }
  return button
}

/**
 * Resolve an event phase from SGR motion, wheel, and release markers.
 *
 * @private
 * @param options - Parsed protocol fields.
 * @returns The normalized event phase.
 */
function resolveEventType({ button, code, suffix }: ResolveEventTypeOptions): SgrMouseEventType {
  return match({
    button,
    isMotion: (code & 32) !== 0,
    isRelease: suffix === 'm',
    isScroll: (code & 64) !== 0,
  })
    .with({ isScroll: true }, () => 'scroll' as const)
    .with({ isRelease: true }, () => 'up' as const)
    .with({ button: 'none', isMotion: true }, () => 'move' as const)
    .with({ isMotion: true }, () => 'drag' as const)
    .otherwise(() => 'down' as const)
}

/**
 * Decode wheel direction for scroll events.
 *
 * @private
 * @param options - SGR code and normalized event type.
 * @returns Scroll metadata only for wheel events.
 */
function resolveScroll({ code, type }: ResolveScrollOptions): SgrMouseScroll | undefined {
  if (type !== 'scroll') {
    return undefined
  }

  const direction = match(code & 3)
    .with(0, () => 'up' as const)
    .with(1, () => 'down' as const)
    .with(2, () => 'left' as const)
    .otherwise(() => 'right' as const)

  return Object.freeze({ delta: 1, direction })
}
