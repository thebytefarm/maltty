import { isPlainObject } from '@maltty/utils/fp'
import pinoRedact from '@pinojs/redact'

const CENSOR = '[REDACTED]'

/**
 * Keys that are always redacted regardless of their depth in the object tree.
 */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'apiSecret',
  'api_secret',
  'authorization',
  'auth',
  'credentials',
  'private_key',
  'privateKey',
])

/**
 * Specific nested paths where the key name alone is not sensitive
 * but the location makes it sensitive. Handled by `@pinojs/redact`.
 */
const SPECIFIC_PATHS: readonly string[] = [
  'headers.Authorization',
  'env.GITHUB_TOKEN',
  'env.LINEAR_API_KEY',
]

const REDACT_PATHS = pinoRedact({
  censor: resolveCensor,
  paths: [...SPECIFIC_PATHS],
  serialize: false,
})

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Censor function for `@pinojs/redact` that preserves null/undefined values.
 *
 * @private
 * @param value - The original value at a redacted path.
 * @returns The censor string or the original null/undefined.
 */
function resolveCensor(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }
  return CENSOR
}

/**
 * Deep-clone an object and replace values at sensitive key paths with `[REDACTED]`.
 *
 * Uses `@pinojs/redact` for specific fixed paths and a recursive walk for
 * any-depth key-name matching against {@link SENSITIVE_KEYS}.
 *
 * @param obj - The object to redact.
 * @returns A deep clone with sensitive values replaced.
 */
export function redactObject<TObj extends object>(obj: TObj): TObj {
  // Accepted exception: pinoRedact returns unknown and the recursive walk
  // Requires Record<string, unknown>. TObj is preserved for the caller.
  // eslint-disable-next-line new-cap -- REDACT_PATHS is a function from pinoRedact, not a constructor
  const pathRedacted = REDACT_PATHS(obj)
  return redactSensitiveKeys(pathRedacted as Record<string, unknown>) as TObj
}

/**
 * Recursively walk an object and redact values whose key is in {@link SENSITIVE_KEYS}.
 * Returns a new object — does not mutate the input.
 *
 * @private
 * @param target - The record to walk.
 * @returns A new record with sensitive values replaced.
 */
function redactSensitiveKeys(target: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(target)
      .filter(([key]) => key !== 'restore')
      .map(([key, value]) => redactEntry(key, value))
  )
}

/**
 * Process a single key-value entry for sensitive-key redaction.
 *
 * @private
 * @param key - The property key.
 * @param value - The property value.
 * @returns A [key, value] tuple with the value potentially redacted.
 */
function redactEntry(key: string, value: unknown): [string, unknown] {
  if (SENSITIVE_KEYS.has(key) && value !== undefined && value !== null) {
    return [key, CENSOR]
  }

  if (Array.isArray(value)) {
    return [key, value.map(redactArrayItem)]
  }

  if (isPlainObject(value)) {
    return [key, redactSensitiveKeys(value as Record<string, unknown>)]
  }

  return [key, value]
}

/**
 * Redact sensitive keys within an array item if it is an object.
 *
 * @private
 * @param item - The array element.
 * @returns The element with sensitive keys redacted, or the original primitive.
 */
function redactArrayItem(item: unknown): unknown {
  if (isPlainObject(item)) {
    return redactSensitiveKeys(item as Record<string, unknown>)
  }
  return item
}
