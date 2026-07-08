import { Output, screen, useApp, useScreenContext } from 'maltty/ui'
import type { ReactElement } from 'react'
import React, { useEffect, useRef } from 'react'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCAN_DELAY_MS = 800

const FINDINGS = [
  {
    category: 'correctness',
    frame: {
      annotation: { column: 7, length: 6, line: 23, message: 'defined here' },
      filePath: 'src/utils/format.ts',
      lines: ['  const result = transform(input)'],
      startLine: 23,
    },
    help: "Remove the variable or prefix with underscore: '_result'.",
    message: "'result' is defined but never used",
    rule: 'no-unused-vars',
    severity: 'warning' as const,
  },
  {
    category: 'correctness',
    frame: {
      annotation: { column: 3, length: 8, line: 42, message: 'reassigned here' },
      filePath: 'src/config/loader.ts',
      lines: ['  options = mergeDefaults(options)'],
      startLine: 42,
    },
    help: 'Use a new const binding instead of reassigning.',
    message: "Assignment to function parameter 'options'",
    rule: 'no-param-reassign',
    severity: 'error' as const,
  },
] as const

const CHECK_RESULTS = [
  { duration: 22, name: 'src/utils/format.test.ts', status: 'pass' as const },
  { duration: 14, name: 'src/auth/token.test.ts', status: 'pass' as const },
  { duration: 9, name: 'src/config/schema.test.ts', status: 'pass' as const },
  { detail: 'auto-fixed 2 issues', name: 'src/utils/validate.ts', status: 'fix' as const },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate an async delay.
 *
 * @private
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/**
 * Scan component that demonstrates ctx.log, ctx.status.spinner, and ctx.report
 * rendered through the Output component.
 */
function ScanScreen({ verbose }: { readonly verbose: boolean }): ReactElement {
  const ctx = useScreenContext()
  const { exit } = useApp()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const run = async (): Promise<void> => {
      ctx.log.info('Starting scan...')

      // Phase 1: Lint
      ctx.status.spinner.start('Running linter...')
      await delay(SCAN_DELAY_MS)
      ctx.status.spinner.stop('Linter complete')

      FINDINGS.reduce((_acc, finding) => {
        ctx.report.finding(finding)
        return _acc
      }, undefined)

      ctx.report.summary({ stats: ['1 warning', '1 error', '6 files'], style: 'inline' })
      ctx.log.newline()

      // Phase 2: Tests
      ctx.status.spinner.start('Running tests...')
      await delay(SCAN_DELAY_MS)
      ctx.status.spinner.stop('Tests complete')

      CHECK_RESULTS.reduce((_acc, result) => {
        ctx.report.check(result)
        return _acc
      }, undefined)

      ctx.report.summary({
        stats: [
          { label: 'Tests', value: '3 passed (3)' },
          { label: 'Fixes', value: '1 auto-fixed' },
          { label: 'Duration', value: '45ms' },
        ],
        style: 'tally',
      })

      ctx.log.newline()

      if (verbose) {
        ctx.log.message('Scanned 6 files across 3 packages')
      }

      ctx.log.success('Scan finished')
      exit()
    }

    void run()
  }, [ctx, exit, verbose])

  return <Output />
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Scan screen - demonstrates ctx.log, ctx.status.spinner, and ctx.report
 * rendered through the Output component in a screen context.
 */
export default screen({
  description: 'Run a simulated lint + test scan with live output',
  exit: 'manual',
  options: z.object({
    verbose: z.boolean().default(false).describe('Show extra scan details'),
  }),
  render: ScanScreen,
})
