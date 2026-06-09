import { describe, expect, it } from 'vitest'

import { createScreenReport } from './screen-report.js'
import { createOutputStore } from './store.js'

describe(createScreenReport, () => {
  it('should push a check entry to the store', () => {
    const store = createOutputStore()
    const report = createScreenReport(store)
    const input = { name: 'lint check', status: 'pass' as const }

    report.check(input)

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'check', input })
  })

  it('should push a finding entry to the store', () => {
    const store = createOutputStore()
    const report = createScreenReport(store)
    const input = {
      severity: 'error' as const,
      rule: 'no-unused-vars',
      message: 'Variable x is unused',
    }

    report.finding(input)

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'finding', input })
  })

  it('should push a summary entry with block style to the store', () => {
    const store = createOutputStore()
    const report = createScreenReport(store)
    const input = {
      style: 'tally' as const,
      stats: [
        { label: 'Passed', value: '3' },
        { label: 'Failed', value: '1' },
      ],
    }

    report.summary(input)

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'summary', input })
  })

  it('should push a summary entry with inline style to the store', () => {
    const store = createOutputStore()
    const report = createScreenReport(store)
    const input = {
      style: 'inline' as const,
      stats: ['1 error', '3 warnings'],
    }

    report.summary(input)

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'summary', input })
  })
})
