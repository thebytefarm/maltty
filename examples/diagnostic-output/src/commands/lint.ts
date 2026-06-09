import { command } from 'maltty'

/**
 * Simulated lint findings for demonstration.
 */
const FINDINGS = [
  {
    category: 'correctness',
    frame: {
      annotation: {
        column: 3,
        length: 8,
        line: 42,
        message: 'mutation of parameter',
      },
      filePath: 'src/auth/middleware.ts',
      lines: [
        '  const token = getToken(req)',
        '  const user = await verifyToken(token)',
        '  req.user = user',
      ],
      startLine: 40,
    },
    help: 'Consider creating a new object instead of mutating the parameter.',
    message: "Assignment to function parameter 'req'",
    rule: 'no-param-reassign',
    severity: 'error' as const,
  },
  {
    category: 'suspicious',
    frame: {
      annotation: {
        column: 7,
        length: 9,
        line: 15,
        message: 'defined here',
      },
      filePath: 'src/config/loader.ts',
      lines: ['  const oldConfig = loadLegacy(path)'],
      startLine: 15,
    },
    help: 'Remove the variable or prefix with an underscore: _oldConfig.',
    message: "'oldConfig' is defined but never used",
    rule: 'no-unused-vars',
    severity: 'warning' as const,
  },
  {
    category: 'style',
    frame: {
      annotation: {
        column: 1,
        length: 3,
        line: 8,
        message: 'use const instead',
      },
      filePath: 'src/utils/helpers.ts',
      lines: ['let counter = 0'],
      startLine: 8,
    },
    help: 'Use `const` if the variable is never reassigned.',
    message: "Unexpected 'let' declaration, use 'const' instead",
    rule: 'prefer-const',
    severity: 'warning' as const,
  },
  {
    message: 'Unexpected console statement',
    rule: 'no-console',
    severity: 'warning' as const,
  },
] as const

export default command({
  description: 'Run linter on the project (simulated)',
  handler: (ctx) => {
    ctx.log.info('Linting project...')
    ctx.log.newline()

    FINDINGS.reduce((_acc, finding) => {
      ctx.report.finding(finding)
      return _acc
    }, undefined)

    ctx.report.summary({
      stats: [
        ctx.colors.red('1 error'),
        ctx.colors.yellow('3 warnings'),
        ctx.colors.dim('95 files'),
        ctx.colors.dim('200 rules'),
        ctx.colors.dim('in 142ms'),
      ],
      style: 'inline',
    })
  },
})
