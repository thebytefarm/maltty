import pc from 'picocolors'
import { match } from 'ts-pattern'

import { formatCodeFrame } from './code-frame.js'
import { GLYPHS } from './constants.js'
import type { CodeFrameInput, FindingInput } from './types.js'

/**
 * Format a full finding (oxlint style).
 *
 * @param input - The finding data to format.
 * @returns A formatted finding string.
 */
export function formatFinding(input: FindingInput): string {
  const severityLabel = match(input.severity)
    .with('error', () => pc.red('error'))
    .with('warning', () => pc.yellow('warning'))
    .with('hint', () => pc.blue('hint'))
    .exhaustive()

  const categoryText = formatCategory(input.category)
  const ruleText = pc.dim(`[${input.rule}]`)
  const categorySuffix = match(categoryText)
    .with('', () => '')
    .otherwise((text) => ` ${text}`)

  const header = `  ${severityLabel}${categorySuffix}: ${input.message} ${ruleText}`

  const framePart = formatFramePart(input.frame)
  const helpPart = formatHelpPart(input.help)

  return [header, ...framePart, ...helpPart].join('')
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format the optional category text.
 *
 * @private
 * @param category - Optional category string.
 * @returns Formatted category or empty string.
 */
function formatCategory(category: string | undefined): string {
  return match(category)
    .with(undefined, () => '')
    .otherwise((c) => pc.dim(`(${c})`))
}

/**
 * Format the optional code frame part.
 *
 * @private
 * @param frame - Optional code frame input.
 * @returns Array with formatted frame line, or empty array.
 */
function formatFramePart(frame: CodeFrameInput | undefined): readonly string[] {
  return match(frame)
    .with(undefined, () => [] as readonly string[])
    .otherwise((f) => [`\n${formatCodeFrame(f)}`])
}

/**
 * Format the optional help text part.
 *
 * @private
 * @param help - Optional help string.
 * @returns Array with formatted help line, or empty array.
 */
function formatHelpPart(help: string | undefined): readonly string[] {
  return match(help)
    .with(undefined, () => [] as readonly string[])
    .otherwise((h) => [`\n  ${pc.cyan(`${GLYPHS.corner}${GLYPHS.dash}`)} ${pc.cyan('help')}: ${h}`])
}
