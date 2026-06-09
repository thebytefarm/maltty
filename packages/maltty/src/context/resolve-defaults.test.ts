import type { Readable, Writable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { EMPTY_CLACK_BASE, mergeClackOpts, resolveClackBase } from './resolve-defaults.js'

describe('resolveClackBase()', () => {
  it('should return EMPTY_CLACK_BASE when defaults is undefined', () => {
    const result = resolveClackBase(undefined)

    expect(result).toBe(EMPTY_CLACK_BASE)
  })

  it('should map guide to withGuide', () => {
    const result = resolveClackBase({ guide: true })

    expect(result).toMatchObject({ withGuide: true })
  })

  it('should map input and output through', () => {
    const input = {} as Readable
    const output = {} as Writable
    const result = resolveClackBase({ input, output })

    expect(result).toMatchObject({ input, output })
  })

  it('should pass through all three properties together', () => {
    const input = {} as Readable
    const output = {} as Writable
    const result = resolveClackBase({ guide: true, input, output })

    expect(result).toMatchObject({ withGuide: true, input, output })
  })
})

describe('mergeClackOpts()', () => {
  it('should return base when opts is undefined', () => {
    const base = resolveClackBase({ guide: true })
    const result = mergeClackOpts(base, undefined)

    expect(result).toBe(base)
  })

  it('should merge base with opts, with opts overriding base', () => {
    const base = resolveClackBase({ guide: true })
    const result = mergeClackOpts(base, { withGuide: false, placeholder: 'hello' })

    expect(result).toMatchObject({ withGuide: false, placeholder: 'hello' })
  })

  it('should preserve base properties not present in opts', () => {
    const input = {} as Readable
    const base = resolveClackBase({ guide: true, input })
    const result = mergeClackOpts(base, { placeholder: 'hello' })

    expect(result).toMatchObject({ withGuide: true, input, placeholder: 'hello' })
  })
})

// eslint-disable-next-line vitest/prefer-describe-function-title -- constant, not a function
describe('EMPTY_CLACK_BASE', () => {
  it('should be a frozen empty object', () => {
    expect(Object.isFrozen(EMPTY_CLACK_BASE)).toBeTruthy()
    expect(Object.keys(EMPTY_CLACK_BASE)).toEqual([])
  })
})
