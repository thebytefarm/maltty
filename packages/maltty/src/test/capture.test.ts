import { describe, expect, it } from 'vitest'

import { createWritableCapture } from './capture.js'

describe('writable capture', () => {
  it('should capture written data', () => {
    const { output, stream } = createWritableCapture()
    stream.write(Buffer.from('hello'))
    stream.write(Buffer.from(' world'))
    expect(output()).toBe('hello world')
  })

  it('should return empty string when nothing written', () => {
    const { output } = createWritableCapture()
    expect(output()).toBe('')
  })
})
