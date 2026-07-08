import pc from 'picocolors'
import { match } from 'ts-pattern'

import type { SummaryBlockInput, SummaryInlineInput, SummaryInput } from './types.js'

/**
 * Format a summary block.
 *
 * - `style: 'tally'` renders labeled stat rows aligned in a block.
 * - `style: 'inline'` renders a pipe-separated one-liner.
 *
 * @param input - The summary data to format.
 * @returns A formatted summary string.
 */
export function formatSummary(input: SummaryInput): string {
  return match(input)
    .with({ style: 'tally' }, formatSummaryBlock)
    .with({ style: 'inline' }, formatSummaryInline)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format a summary block with labeled stat rows.
 *
 * @private
 * @param input - The summary block data.
 * @returns A formatted summary block string.
 */
function formatSummaryBlock(input: SummaryBlockInput): string {
  const maxWidth = input.stats.reduce((max, stat) => Math.max(max, stat.label.length), 0)

  return input.stats.map((stat) => `  ${stat.label.padEnd(maxWidth)}  ${stat.value}`).join('\n')
}

/**
 * Format a summary inline as a pipe-separated one-liner.
 *
 * @private
 * @param input - The summary inline data.
 * @returns A formatted summary line string.
 */
function formatSummaryInline(input: SummaryInlineInput): string {
  return `  ${input.stats.join(pc.gray(' | '))}`
}
