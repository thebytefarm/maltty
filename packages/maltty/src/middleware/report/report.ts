import { decorateContext } from '@/context/decorate.js'
import { formatCheck } from '@/lib/format/check.js'
import { formatFinding } from '@/lib/format/finding.js'
import { formatSummary } from '@/lib/format/tally.js'
import type { CheckInput, FindingInput, SummaryInput } from '@/lib/format/types.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type { Report, ReportEnv, ReportOptions } from './types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a Report instance backed by format functions.
 *
 * @param options - Optional configuration for the report instance.
 * @returns A frozen Report object that writes formatted output to the stream.
 */
export function createReport(options?: { readonly output?: NodeJS.WritableStream }): Report {
  const output = resolveOutput(options)

  return Object.freeze({
    check(input: CheckInput) {
      output.write(`${formatCheck(input)}\n`)
    },
    finding(input: FindingInput) {
      output.write(`${formatFinding(input)}\n\n`)
    },
    summary(input: SummaryInput) {
      output.write(`\n${formatSummary(input)}\n`)
    },
  })
}

/**
 * Create a report middleware that decorates `ctx.report`.
 *
 * Provides structured terminal reporting (checks, findings, summaries)
 * through a single unified API on `ctx.report`.
 *
 * @param options - Optional middleware configuration.
 * @returns A Middleware instance that adds `ctx.report`.
 *
 * @example
 * ```ts
 * import { report } from 'maltty/report'
 *
 * cli({
 *   middleware: [
 *     report(),
 *   ],
 * })
 * ```
 */
export function report(options?: ReportOptions): Middleware<ReportEnv> {
  return middleware<ReportEnv>((ctx, next) => {
    const reportInstance = resolveReport(options)

    decorateContext(ctx, 'report', reportInstance)

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the output stream from options, defaulting to `process.stderr`.
 *
 * @private
 * @param options - Optional configuration containing an output stream.
 * @returns The resolved writable stream.
 */
function resolveOutput(
  options: { readonly output?: NodeJS.WritableStream } | undefined
): NodeJS.WritableStream {
  if (options === undefined) {
    return process.stderr
  }

  if (options.output === undefined) {
    return process.stderr
  }

  return options.output
}

/**
 * Resolve the Report instance from options, using a custom override or creating a new one.
 *
 * @private
 * @param options - The raw middleware options.
 * @returns A Report instance.
 */
function resolveReport(options: ReportOptions | undefined): Report {
  if (options === undefined) {
    return createReport()
  }

  if (options.report !== undefined) {
    return options.report
  }

  return createReport({ output: options.output })
}
