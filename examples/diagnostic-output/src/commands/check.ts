import { command } from 'maltty'

/**
 * Simulated lint findings.
 */
const FINDINGS = [
  {
    category: 'correctness',
    frame: {
      annotation: {
        column: 7,
        length: 6,
        line: 23,
        message: 'defined here',
      },
      filePath: 'src/utils/format.ts',
      lines: ['  const result = transform(input)'],
      startLine: 23,
    },
    help: "Remove the variable or prefix with underscore: '_result'.",
    message: "'result' is defined but never used",
    rule: 'no-unused-vars',
    severity: 'warning' as const,
  },
] as const

/**
 * Simulated test results.
 */
const RESULTS = [
  { duration: 22, name: 'src/utils/format.test.ts', status: 'pass' as const },
  { duration: 14, name: 'src/auth/token.test.ts', status: 'pass' as const },
  { duration: 9, name: 'src/config/schema.test.ts', status: 'pass' as const },
  {
    detail: 'auto-fixed 2 issues',
    name: 'src/utils/validate.ts',
    status: 'fix' as const,
  },
] as const

export default command({
  description: 'Run lint + tests together (simulated)',
  handler: (ctx) => {
    // Lint phase
    ctx.log.step('Lint')
    ctx.log.newline()

    FINDINGS.reduce((_acc, finding) => {
      ctx.report.finding(finding)
      return _acc
    }, undefined)

    ctx.report.summary({
      stats: [
        ctx.colors.yellow('1 warning'),
        ctx.colors.green('2 fixed'),
        ctx.colors.dim('12 files'),
        ctx.colors.dim('in 47ms'),
      ],
      style: 'inline',
    })

    ctx.log.newline()

    // Test phase
    ctx.log.step('Test')
    ctx.log.newline()

    RESULTS.reduce((_acc, result) => {
      ctx.report.check(result)
      return _acc
    }, undefined)

    ctx.report.summary({
      stats: [
        { label: 'Tests', value: `${ctx.colors.green('3 passed')} ${ctx.colors.gray('(3)')}` },
        { label: 'Suites', value: `${ctx.colors.green('3 passed')} ${ctx.colors.gray('(3)')}` },
        { label: 'Duration', value: '45ms' },
      ],
      style: 'tally',
    })
  },
})
