import { createConfigClient } from 'maltty/config'
import { describe, expect, it } from 'vitest'

describe('maltty/config', () => {
  it('should export the standalone config client', () => {
    expect(createConfigClient).toBeTypeOf('function')
  })
})
