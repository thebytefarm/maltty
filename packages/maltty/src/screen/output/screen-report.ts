import type { CheckInput, FindingInput, SummaryInput } from '@/lib/format/types.js'
import type { Report } from '@/middleware/report/types.js'

import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Create a {@link Report} instance that writes to an {@link OutputStore}
 * for rendering by the `<Output />` component.
 *
 * @param store - The output store to push entries to.
 * @returns A frozen Report instance compatible with `ctx.report`.
 */
export function createScreenReport(store: OutputStore): Report {
  return Object.freeze({
    check(input: CheckInput): void {
      store.push({ kind: 'check', input })
    },

    finding(input: FindingInput): void {
      store.push({ kind: 'finding', input })
    },

    summary(input: SummaryInput): void {
      store.push({ kind: 'summary', input })
    },
  })
}
