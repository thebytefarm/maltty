import { describe, expect, it } from 'vitest'

import { createContextError, isContextError } from './error.js'

describe('createContextError()', () => {
  it('is an instance of Error', () => {
    const err = createContextError('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('has name "ContextError"', () => {
    const err = createContextError('test')
    expect(err.name).toBe('ContextError')
  })

  it('has default exitCode of 1', () => {
    const err = createContextError('test')
    expect(err.exitCode).toBe(1)
  })

  it('accepts a custom exitCode', () => {
    const err = createContextError('test', { exitCode: 2 })
    expect(err.exitCode).toBe(2)
  })

  it('accepts a code string', () => {
    const err = createContextError('test', { code: 'ERR_TEST' })
    expect(err.code).toBe('ERR_TEST')
  })

  it('has undefined code by default', () => {
    const err = createContextError('test')
    expect(err.code).toBeUndefined()
  })

  it('preserves the message', () => {
    const err = createContextError('something went wrong')
    expect(err.message).toBe('something went wrong')
  })
})

describe('isContextError()', () => {
  it('returns true for context errors', () => {
    const err = createContextError('test')
    expect(isContextError(err)).toBeTruthy()
  })

  it('returns false for regular errors', () => {
    const err = new Error('test')
    expect(isContextError(err)).toBeFalsy()
  })

  it('returns false for non-error values', () => {
    expect(isContextError('not an error')).toBeFalsy()
    expect(isContextError(null)).toBeFalsy()
    expect(isContextError(undefined)).toBeFalsy()
  })
})
