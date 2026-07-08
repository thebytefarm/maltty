# Diagnostic Output

Demonstrates the `ctx.report` styled output methods for displaying linting, testing, and diagnostic results in the terminal.

## Commands

| Command    | What it shows                                             |
| ---------- | --------------------------------------------------------- |
| `dx lint`  | Findings with code frames, help text, and a tally footer  |
| `dx test`  | Test results with pass/fail/skip rows and a tally summary |
| `dx check` | Combined lint + test output in a single command           |

## Output Methods Used

- `ctx.report.finding()` -- full lint finding with severity, rule, code frame, and help text
- `ctx.report.check()` -- single pass/fail/warn/skip/fix row
- `ctx.report.summary({ style: 'tally' })` -- labeled stat rows (e.g. Tests, Suites, Duration)
- `ctx.report.summary({ style: 'inline' })` -- pipe-separated one-liner stats footer
- `ctx.colors` -- color formatting for summary values and terminal text

## Structure

```text
examples/diagnostic-output/
├── maltty.config.ts           # CLI build config
├── src/
│   ├── index.ts             # CLI entry point
│   └── commands/
│       ├── lint.ts           # Linter output demo
│       ├── test.ts           # Test runner output demo
│       └── check.ts          # Combined lint + test demo
```
