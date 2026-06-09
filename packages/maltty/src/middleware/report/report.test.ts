import { createWritableCapture, runMiddleware } from 'maltty/test'
import { describe, expect, it } from 'vitest'

import { createReport, report } from './report.js'

describe('createReport()', () => {
  it('should create a Report with check, finding, and summary methods', () => {
    const { stream } = createWritableCapture()
    const r = createReport({ output: stream })

    expect(typeof r.check).toBe('function')
    expect(typeof r.finding).toBe('function')
    expect(typeof r.summary).toBe('function')
  })

  it('should write formatted output for check()', () => {
    const { output, stream } = createWritableCapture()
    const r = createReport({ output: stream })

    r.check({ status: 'pass', name: 'test' })

    expect(output().length).toBeGreaterThan(0)
  })

  it('should write formatted output for finding()', () => {
    const { output, stream } = createWritableCapture()
    const r = createReport({ output: stream })

    r.finding({ severity: 'error', rule: 'no-bug', message: 'broken' })

    expect(output().length).toBeGreaterThan(0)
  })

  it('should write formatted output for summary()', () => {
    const { output, stream } = createWritableCapture()
    const r = createReport({ output: stream })

    r.summary({ style: 'inline', stats: ['1 passed', '0 failed'] })

    expect(output().length).toBeGreaterThan(0)
  })

  it('should default output to process.stderr when no options are provided', () => {
    const r = createReport()

    expect(typeof r.check).toBe('function')
    expect(typeof r.finding).toBe('function')
    expect(typeof r.summary).toBe('function')
  })
})

describe('report()', () => {
  it('should return a middleware that decorates ctx with report', async () => {
    const { stream } = createWritableCapture()
    const mw = report({ output: stream })

    const { ctx } = await runMiddleware({ middlewares: [mw] })
    const decorated = ctx as typeof ctx & Readonly<{ report: unknown }>

    expect(decorated.report).toBeDefined()
    expect(typeof decorated.report).toBe('object')
  })
})
