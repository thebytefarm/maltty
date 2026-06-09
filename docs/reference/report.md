# report()

Structured reporting middleware. Decorates `ctx.report` with methods for writing checks, findings, and summaries.

Import from `maltty/report`.

## report(options?)

Create the report middleware.

| Option   | Type                    | Default          | Description                                       |
| -------- | ----------------------- | ---------------- | ------------------------------------------------- |
| `output` | `NodeJS.WritableStream` | `process.stderr` | Output stream for report output                   |
| `report` | `Report`                | --               | Custom Report implementation (useful for testing) |

## createReport(options?)

Create a standalone Report instance outside the middleware pipeline.

| Option   | Type                    | Default          | Description                     |
| -------- | ----------------------- | ---------------- | ------------------------------- |
| `output` | `NodeJS.WritableStream` | `process.stderr` | Output stream for report output |

## Report

The `ctx.report` interface:

| Method    | Signature                       | Description                              |
| --------- | ------------------------------- | ---------------------------------------- |
| `check`   | `(input: CheckInput) => void`   | Write a pass/fail/warn/skip/fix row      |
| `finding` | `(input: FindingInput) => void` | Write a finding with optional code frame |
| `summary` | `(input: SummaryInput) => void` | Write a summary block or inline stats    |

## CheckInput

| Field      | Type                                            | Required | Description                              |
| ---------- | ----------------------------------------------- | -------- | ---------------------------------------- |
| `status`   | `'pass' \| 'fail' \| 'warn' \| 'skip' \| 'fix'` | yes      | Check status                             |
| `name`     | `string`                                        | yes      | Display name (e.g. file path, test name) |
| `detail`   | `string`                                        | no       | Detail text shown after the name         |
| `duration` | `number`                                        | no       | Duration in milliseconds                 |
| `hint`     | `string`                                        | no       | Hint shown at the end                    |

## FindingInput

| Field      | Type                             | Required | Description                             |
| ---------- | -------------------------------- | -------- | --------------------------------------- |
| `severity` | `'error' \| 'warning' \| 'hint'` | yes      | Finding severity                        |
| `rule`     | `string`                         | yes      | Rule identifier (e.g. `no-unused-vars`) |
| `message`  | `string`                         | yes      | Finding message                         |
| `category` | `string`                         | no       | Category (e.g. `correctness`, `style`)  |
| `help`     | `string`                         | no       | Help text with suggested fix            |
| `frame`    | `CodeFrameInput`                 | no       | Source code frame with annotation       |

## CodeFrameInput

| Field        | Type                  | Description                                |
| ------------ | --------------------- | ------------------------------------------ |
| `filePath`   | `string`              | File path displayed above the frame        |
| `lines`      | `readonly string[]`   | Source lines to display                    |
| `startLine`  | `number`              | 1-based line number of the first line      |
| `annotation` | `CodeFrameAnnotation` | Annotation to render below the target line |

## CodeFrameAnnotation

| Field     | Type     | Description                            |
| --------- | -------- | -------------------------------------- |
| `line`    | `number` | 1-based line number to annotate        |
| `column`  | `number` | 1-based column where annotation starts |
| `length`  | `number` | Length of the annotated span           |
| `message` | `string` | Message shown on the annotation line   |

## SummaryInput

Discriminated union on `style`:

### Block style (`'tally'`)

| Field   | Type                     | Description                     |
| ------- | ------------------------ | ------------------------------- |
| `style` | `'tally'`                | Aligned multi-row summary block |
| `stats` | `readonly SummaryStat[]` | Labeled stat rows               |

### Inline style

| Field   | Type                | Description                 |
| ------- | ------------------- | --------------------------- |
| `style` | `'inline'`          | Pipe-separated one-liner    |
| `stats` | `readonly string[]` | Pre-formatted stat segments |

## SummaryStat

| Field   | Type     | Description                              |
| ------- | -------- | ---------------------------------------- |
| `label` | `string` | Row label (e.g. `Tests`, `Duration`)     |
| `value` | `string` | Row value (can contain pre-colored text) |

## ReportEnv

Middleware environment descriptor. Declares that `ctx.report` will be available after this middleware runs.

## Module augmentation

```ts
import type { Report } from 'maltty/report'

declare module 'maltty' {
  interface CommandContext {
    readonly report: Report
  }
}
```

## References

- [Reporting](../concepts/reporting.md)
- [Core](./maltty.md)
