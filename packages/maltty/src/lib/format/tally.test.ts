import { describe, expect, it } from 'vitest'

import { formatSummary } from './tally.js'

describe('formatSummary()', () => {
  describe('style: inline', () => {
    it('should join stats with pipe separator', () => {
      const result = formatSummary({ stats: ['1 error', '3 warnings'], style: 'inline' })
      expect(result).toContain('1 error')
      expect(result).toContain('3 warnings')
    })

    it('should handle single stat', () => {
      const result = formatSummary({ stats: ['95 files'], style: 'inline' })
      expect(result).toContain('95 files')
    })
  })

  describe('style: tally', () => {
    it('should format labeled rows', () => {
      const result = formatSummary({
        stats: [
          { label: 'Tests', value: '3 passed' },
          { label: 'Duration', value: '5.63s' },
        ],
        style: 'tally',
      })
      expect(result).toContain('Tests')
      expect(result).toContain('3 passed')
      expect(result).toContain('Duration')
      expect(result).toContain('5.63s')
    })

    it('should align labels by padding', () => {
      const result = formatSummary({
        stats: [
          { label: 'Tests', value: 'ok' },
          { label: 'Duration', value: '1s' },
        ],
        style: 'tally',
      })
      // "Duration" is 8 chars, "Tests" should be padded to match
      expect(result).toContain('Tests   ')
    })
  })
})
