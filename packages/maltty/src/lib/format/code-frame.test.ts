import { describe, expect, it } from 'vitest'

import { formatCodeFrame } from './code-frame'
import type { CodeFrameInput } from './types'

describe('formatCodeFrame()', () => {
  it('should format a code frame with annotation', () => {
    const input: CodeFrameInput = {
      annotation: {
        column: 11,
        length: 9,
        line: 2,
        message: 'Unexpected any value',
      },
      filePath: 'src/index.ts',
      lines: ['const a = 1', 'const b = any_value', 'const c = 3'],
      startLine: 1,
    }

    const result = formatCodeFrame(input)

    expect(result).toContain('src/index.ts')
    expect(result).toContain('const b = any_value')
    expect(result).toContain('Unexpected any value')
  })

  it('should include line numbers', () => {
    const input: CodeFrameInput = {
      annotation: {
        column: 7,
        length: 1,
        line: 11,
        message: 'unused variable',
      },
      filePath: 'src/utils.ts',
      lines: ['const x = 1', 'const y = 2', 'const z = 3'],
      startLine: 10,
    }

    const result = formatCodeFrame(input)

    expect(result).toContain('10')
    expect(result).toContain('11')
    expect(result).toContain('12')
  })

  it('should place annotation under the correct line', () => {
    const input: CodeFrameInput = {
      annotation: {
        column: 7,
        length: 6,
        line: 6,
        message: 'bad variable',
      },
      filePath: 'src/app.ts',
      lines: ['const first = 1', 'const second = 2', 'const third = 3'],
      startLine: 5,
    }

    const result = formatCodeFrame(input)
    const resultLines = result.split('\n')

    const annotatedLineIdx = resultLines.findIndex((l) => l.includes('const second = 2'))
    const messageIdx = resultLines.findIndex((l) => l.includes('bad variable'))

    expect(annotatedLineIdx).toBeGreaterThan(-1)
    expect(messageIdx).toBe(annotatedLineIdx + 1)
  })

  it('should return error message for invalid annotation', () => {
    const input = {
      annotation: {
        column: 0,
        length: -1,
        line: 1,
        message: 'bad',
      },
      filePath: 'src/invalid.ts',
      lines: ['const x = 1'],
      startLine: 1,
    } as CodeFrameInput

    const result = formatCodeFrame(input)

    expect(result).toContain('Invalid code frame annotation')
  })

  it('should handle single-line frames', () => {
    const input: CodeFrameInput = {
      annotation: {
        column: 1,
        length: 3,
        line: 1,
        message: 'Use const instead of let',
      },
      filePath: 'src/single.ts',
      lines: ['let x = 42'],
      startLine: 1,
    }

    const result = formatCodeFrame(input)

    expect(result).toContain('src/single.ts')
    expect(result).toContain('let x = 42')
    expect(result).toContain('Use const instead of let')
  })
})
