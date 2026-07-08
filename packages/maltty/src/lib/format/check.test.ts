import { describe, expect, it } from 'vitest'

import { formatCheck } from './check.js'
import { GLYPHS } from './constants.js'

describe('formatCheck()', () => {
  it('should format a passing check', () => {
    const result = formatCheck({ name: 'src/utils.test.ts', status: 'pass' })

    expect(result).toContain('src/utils.test.ts')
    expect(result).toContain(GLYPHS.check)
  })

  it('should format a failing check', () => {
    const result = formatCheck({ name: 'src/auth.test.ts', status: 'fail' })

    expect(result).toContain('src/auth.test.ts')
    expect(result).toContain(GLYPHS.cross)
  })

  it('should format a warning check', () => {
    const result = formatCheck({ name: 'src/config.ts', status: 'warn' })

    expect(result).toContain('src/config.ts')
    expect(result).toContain(GLYPHS.warning)
  })

  it('should format a skipped check', () => {
    const result = formatCheck({ name: 'src/old.test.ts', status: 'skip' })

    expect(result).toContain('src/old.test.ts')
    expect(result).toContain(GLYPHS.skip)
  })

  it('should format a fixed check', () => {
    const result = formatCheck({ name: 'src/lint.ts', status: 'fix' })

    expect(result).toContain('src/lint.ts')
    expect(result).toContain(GLYPHS.fix)
  })

  it('should include detail text when provided', () => {
    const result = formatCheck({
      detail: '3 tests passed',
      name: 'src/utils.test.ts',
      status: 'pass',
    })

    expect(result).toContain('3 tests passed')
  })

  it('should include duration when provided', () => {
    const result = formatCheck({
      duration: 150,
      name: 'src/utils.test.ts',
      status: 'pass',
    })

    expect(result).toContain('150ms')
  })

  it('should include hint when provided', () => {
    const result = formatCheck({
      hint: 'experimental',
      name: 'src/utils.test.ts',
      status: 'pass',
    })

    expect(result).toContain('[experimental]')
  })
})
