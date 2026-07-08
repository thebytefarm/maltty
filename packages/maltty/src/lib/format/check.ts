import pc from 'picocolors'
import { match } from 'ts-pattern'
import { z } from 'zod'

import { GLYPHS } from './constants.js'
import { formatDuration } from './duration.js'
import type { CheckInput } from './types.js'

/**
 * Zod schema for validating a check status at the public API boundary.
 *
 * @private
 */
const CheckStatusSchema = z.enum(['pass', 'fail', 'warn', 'skip', 'fix'])

/**
 * Format a single pass/fail/warn check row.
 *
 * @param input - The check data to format.
 * @returns A formatted check string.
 */
export function formatCheck(input: CheckInput): string {
  const parsedStatus = CheckStatusSchema.safeParse(input.status)
  if (!parsedStatus.success) {
    return `[Invalid check status: ${parsedStatus.error.issues.map((issue) => issue.message).join(', ')}]`
  }

  const icon = match(input.status)
    .with('pass', () => pc.green(GLYPHS.check))
    .with('fail', () => pc.red(GLYPHS.cross))
    .with('warn', () => pc.yellow(GLYPHS.warning))
    .with('skip', () => pc.gray(GLYPHS.skip))
    .with('fix', () => pc.blue(GLYPHS.fix))
    .exhaustive()

  const nameText = match(input.status)
    .with('fail', () => pc.red(input.name))
    .with('warn', () => pc.yellow(input.name))
    .with('skip', () => pc.gray(input.name))
    .otherwise(() => input.name)

  const detailText = formatOptionalDetail(input.detail)
  const durationText = formatOptionalDuration(input.duration)
  const hintText = formatOptionalHint(input.hint)

  return ` ${icon} ${nameText}${detailText}${durationText}${hintText}`
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format optional detail text.
 *
 * @private
 * @param detail - Optional detail string.
 * @returns Formatted detail or empty string.
 */
function formatOptionalDetail(detail: string | undefined): string {
  return match(detail)
    .with(undefined, () => '')
    .otherwise((d) => ` ${pc.gray(d)}`)
}

/**
 * Format optional duration for a check row.
 *
 * @private
 * @param duration - Optional duration in milliseconds.
 * @returns Formatted duration or empty string.
 */
function formatOptionalDuration(duration: number | undefined): string {
  return match(duration)
    .with(undefined, () => '')
    .otherwise((d) => ` ${pc.gray(`(${formatDuration(d)})`)}`)
}

/**
 * Format optional hint text.
 *
 * @private
 * @param hint - Optional hint string.
 * @returns Formatted hint or empty string.
 */
function formatOptionalHint(hint: string | undefined): string {
  return match(hint)
    .with(undefined, () => '')
    .otherwise((h) => ` ${pc.dim(`[${h}]`)}`)
}
