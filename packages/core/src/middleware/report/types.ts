import type { CheckInput, FindingInput, SummaryInput } from '@/lib/format/types.js'

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/**
 * Structured reporting API for checks, findings, and summaries.
 *
 * Provides methods to write pass/fail rows, lint-style findings with
 * optional code frames, and summary blocks to the output stream.
 */
export interface Report {
  /**
   * Write a single pass/fail/warn/skip/fix check row.
   */
  readonly check: (input: CheckInput) => void
  /**
   * Write a finding with optional code frame.
   */
  readonly finding: (input: FindingInput) => void
  /**
   * Write a summary block or inline stats.
   */
  readonly summary: (input: SummaryInput) => void
}

// ---------------------------------------------------------------------------
// Report Options
// ---------------------------------------------------------------------------

/**
 * Configuration options for the {@link report} middleware factory.
 */
export interface ReportOptions {
  /**
   * Writable stream for report output. Defaults to `process.stderr`.
   */
  readonly output?: NodeJS.WritableStream
  /**
   * Override with a custom Report implementation (useful for testing).
   */
  readonly report?: Report
}

// ---------------------------------------------------------------------------
// Report Env
// ---------------------------------------------------------------------------

/**
 * Middleware environment descriptor for the report middleware.
 *
 * Declares that `ctx.report` will be available after this middleware runs.
 */
export interface ReportEnv {
  readonly Variables: {
    readonly report: Report
  }
}

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------

/**
 * Augments the base {@link CommandContext} with an optional `report` property.
 *
 * When a consumer imports `@maltty/core/report`, this declaration merges
 * `report` onto `CommandContext` so that `ctx.report` is typed without manual casting.
 */
declare module '@maltty/core' {
  interface CommandContext {
    readonly report: Report
  }
}
