/**
 * Status for a single check row (e.g. test file, lint check).
 */
export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip' | 'fix'

/**
 * Severity level for a finding.
 */
export type FindingSeverity = 'error' | 'warning' | 'hint'

/**
 * Input for a single pass/fail/warn check row.
 */
export interface CheckInput {
  /**
   * Status of the check.
   */
  readonly status: CheckStatus
  /**
   * Display name (e.g. file path, test name).
   */
  readonly name: string
  /**
   * Optional detail text shown after the name.
   */
  readonly detail?: string
  /**
   * Duration in milliseconds.
   */
  readonly duration?: number
  /**
   * Optional hint shown at the end.
   */
  readonly hint?: string
}

/**
 * A labeled row in a summary block.
 */
export interface SummaryStat {
  /**
   * Row label (e.g. "Tests", "Duration").
   */
  readonly label: string
  /**
   * Row value — can contain pre-colored text.
   */
  readonly value: string
}

/**
 * Summary block: labeled rows aligned in a block.
 *
 * ```
 *   Tests     3 passed | 2 failed (5)
 *   Duration  5.63s
 * ```
 */
export interface SummaryBlockInput {
  /**
   * Display as a multi-row summary block.
   */
  readonly style: 'tally'
  /**
   * One or more labeled stat rows.
   */
  readonly stats: readonly SummaryStat[]
}

/**
 * Summary inline: pipe-separated one-liner.
 *
 * ```
 *   1 error | 3 warnings | 95 files | in 142ms
 * ```
 */
export interface SummaryInlineInput {
  /**
   * Display as a single-line stats footer.
   */
  readonly style: 'inline'
  /**
   * Pre-formatted stat segments to join with pipes.
   */
  readonly stats: readonly string[]
}

/**
 * Discriminated union for summary output.
 */
export type SummaryInput = SummaryBlockInput | SummaryInlineInput

/**
 * Annotation applied to a line in a code frame.
 */
export interface CodeFrameAnnotation {
  /**
   * 1-based line number to annotate.
   */
  readonly line: number
  /**
   * 1-based column where the annotation starts.
   */
  readonly column: number
  /**
   * Length of the annotated span.
   */
  readonly length: number
  /**
   * Message shown on the annotation line.
   */
  readonly message: string
}

/**
 * Input for a standalone annotated code snippet.
 */
export interface CodeFrameInput {
  /**
   * File path displayed above the frame.
   */
  readonly filePath: string
  /**
   * Source lines to display.
   */
  readonly lines: readonly string[]
  /**
   * 1-based line number of the first line in `lines`.
   */
  readonly startLine: number
  /**
   * Annotation to render below the target line.
   */
  readonly annotation: CodeFrameAnnotation
}

/**
 * Input for a full finding (lint error/warning).
 */
export interface FindingInput {
  /**
   * Severity of the finding.
   */
  readonly severity: FindingSeverity
  /**
   * Rule identifier (e.g. "no-unused-vars").
   */
  readonly rule: string
  /**
   * Optional category (e.g. "correctness", "style").
   */
  readonly category?: string
  /**
   * Finding message.
   */
  readonly message: string
  /**
   * Optional code frame showing the problematic code.
   */
  readonly frame?: CodeFrameInput
  /**
   * Optional help text with a suggested fix.
   */
  readonly help?: string
}
