import { Writable } from 'node:stream'

/**
 * A writable stream capture for collecting output in tests.
 */
export interface WritableCapture {
  readonly output: () => string
  readonly stream: Writable
}

/**
 * Create a writable stream that captures all written data into a string buffer.
 * Useful for asserting against logger output in handler tests.
 *
 * @returns A WritableCapture with an output accessor and the underlying stream.
 */
export function createWritableCapture(): WritableCapture {
  const chunks: string[] = []
  const stream = new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void): void {
      chunks.push(chunk.toString())
      callback()
    },
  })
  return { output: () => chunks.join(''), stream } satisfies WritableCapture
}
