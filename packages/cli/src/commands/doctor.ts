import { loadConfig } from '@maltty/config/utils'
import { match } from '@maltty/utils/fp'
import { readManifest } from '@maltty/utils/manifest'
import { command } from 'maltty'
import type { Command, CommandContext } from 'maltty'
import pc from 'picocolors'
import { z } from 'zod'

import type { CheckContext, CheckResult, CheckStatus, FixResult } from '../lib/checks.js'
import { CHECKS, createCheckContext, readRawPackageJson } from '../lib/checks.js'

const options = z.object({
  fix: z.boolean().describe('Auto-fix issues where possible').optional(),
})

type DoctorArgs = z.infer<typeof options>

/**
 * Diagnose common maltty project issues.
 *
 * Validates config, checks package.json setup, verifies entry points exist,
 * and catches anything that could cause build or runtime failures.
 */
const doctorCommand: Command = command({
  options,
  description: 'Diagnose common maltty project issues',
  handler: async (ctx: CommandContext<DoctorArgs>) => {
    const cwd = process.cwd()
    const shouldFix = ctx.args.fix === true

    const [configError, configResult] = await loadConfig({ cwd })
    const [, manifest] = await readManifest(cwd)
    const [, rawPackageJson] = await readRawPackageJson(cwd)

    const context = createCheckContext({
      configError,
      configResult,
      cwd,
      manifest,
      rawPackageJson,
    })

    ctx.status.spinner.start('Running diagnostics...')

    const initialResults = await Promise.all(CHECKS.map((check) => check.run(context)))

    const fixResults = await resolveFixResults(shouldFix, initialResults, context)
    const fixed = fixResults.filter((r) => r.fixed).length
    const results = await resolveResults({ cwd, fixed, initialResults, shouldFix })

    ctx.status.spinner.stop('Diagnostics complete')

    displayResults(ctx, results, fixResults)

    const passed = results.filter((r) => r.status === 'pass').length
    const warnings = results.filter((r) => r.status === 'warn').length
    const failed = results.filter((r) => r.status === 'fail').length

    const summary = formatSummary({ failed, fixed, passed, total: results.length, warnings })

    ctx.log.raw(summary)

    if (failed > 0) {
      ctx.fail(`${failed} ${pluralizeCheck(failed)} failed`)
    }
  },
})

export default doctorCommand

// ---------------------------------------------------------------------------
// Fix orchestration
// ---------------------------------------------------------------------------

/**
 * Resolve fix results based on whether --fix is enabled.
 *
 * @private
 * @param shouldFix - Whether the --fix flag was set.
 * @param results - The initial check results.
 * @param context - The diagnostic check context.
 * @returns Fix results when --fix is enabled, empty array otherwise.
 */
async function resolveFixResults(
  shouldFix: boolean,
  results: readonly CheckResult[],
  context: CheckContext
): Promise<readonly FixResult[]> {
  if (!shouldFix) {
    return []
  }

  return applyFixes(results, context)
}

/**
 * Resolve the final check results, re-running after fixes when needed.
 *
 * Rebuilds the context from disk so that fixes to package.json are reflected.
 *
 * @private
 * @param params - The resolution parameters.
 * @returns Updated check results if fixes were applied, otherwise the initial results.
 */
async function resolveResults(params: {
  readonly cwd: string
  readonly fixed: number
  readonly initialResults: readonly CheckResult[]
  readonly shouldFix: boolean
}): Promise<readonly CheckResult[]> {
  if (!params.shouldFix || params.fixed === 0) {
    return params.initialResults
  }

  const [configError, configResult] = await loadConfig({ cwd: params.cwd })
  const [, manifest] = await readManifest(params.cwd)
  const [, rawPackageJson] = await readRawPackageJson(params.cwd)

  const freshContext = createCheckContext({
    configError,
    configResult,
    cwd: params.cwd,
    manifest,
    rawPackageJson,
  })

  return Promise.all(CHECKS.map((check) => check.run(freshContext)))
}

/**
 * Apply fixes for all non-passing checks that have a fix function.
 *
 * @private
 * @param results - The initial check results.
 * @param context - The diagnostic check context.
 * @returns An array of FixResults for checks that were attempted.
 */
async function applyFixes(
  results: readonly CheckResult[],
  context: CheckContext
): Promise<readonly FixResult[]> {
  const fixable = CHECKS.filter((check) => {
    if (!check.fix) {
      return false
    }

    const result = results.find((r) => r.name === check.name)
    return result !== undefined && result.status !== 'pass'
  }).flatMap((check) => {
    if (check.fix) {
      return [check.fix]
    }
    return []
  })

  return Promise.all(fixable.map((fix) => fix(context)))
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/**
 * Display check results with hints and fix indicators.
 *
 * @private
 * @param ctx - The command context for logging.
 * @param results - The check results to display.
 * @param fixResults - The fix results (empty when --fix was not used).
 */
function displayResults(
  ctx: CommandContext,
  results: readonly CheckResult[],
  fixResults: readonly FixResult[]
): void {
  const lines = results.map((result) => formatResultLine(result, fixResults))
  const output = lines.join('')
  if (output.length > 0) {
    ctx.log.raw(output)
  }
}

/**
 * Format a single check result line with optional hint.
 *
 * @private
 * @param result - The check result to format.
 * @param fixResults - The fix results to check for applied fixes.
 * @returns The formatted result line string.
 */
function formatResultLine(result: CheckResult, fixResults: readonly FixResult[]): string {
  const appliedFix = fixResults.find((f) => f.name === result.name && f.fixed)

  if (appliedFix) {
    return `  ${formatDisplayStatus('fix')}  ${result.name} - ${appliedFix.message}\n`
  }

  const line = `  ${formatDisplayStatus(result.status)}  ${result.name} - ${result.message}\n`

  if (result.hint && result.status !== 'pass') {
    return `${line}        ${pc.dim(`→ ${result.hint}`)}\n`
  }

  return line
}

/**
 * Format a display status with color.
 *
 * Accepts both CheckStatus values and the 'fix' display status.
 *
 * @private
 * @param status - The status to format.
 * @returns A colored string representation of the status.
 */
function formatDisplayStatus(status: CheckStatus | 'fix'): string {
  return match(status)
    .with('pass', () => pc.green('pass'))
    .with('warn', () => pc.yellow('warn'))
    .with('fix', () => pc.blue('fix '))
    .with('fail', () => pc.red('fail'))
    .exhaustive()
}

/**
 * Format the summary line with counts.
 *
 * @private
 * @param params - The count parameters.
 * @returns A formatted summary string.
 */
function formatSummary(params: {
  readonly total: number
  readonly passed: number
  readonly warnings: number
  readonly failed: number
  readonly fixed: number
}): string {
  const base = `\n${params.total} checks, ${params.passed} passed, ${params.warnings} warnings, ${params.failed} failed`

  if (params.fixed > 0) {
    return `${base}, ${params.fixed} fixed\n`
  }

  return `${base}\n`
}

/**
 * Pluralize the word "check" based on count.
 *
 * @private
 * @param count - The number of checks.
 * @returns "check" or "checks".
 */
function pluralizeCheck(count: number): string {
  if (count === 1) {
    return 'check'
  }

  return 'checks'
}
