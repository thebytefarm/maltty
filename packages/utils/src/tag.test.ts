import { match, P } from 'ts-pattern'
import { describe, expect, it } from 'vitest'

import { TAG, getTag, hasTag, withTag } from './tag.js'

describe('tAG constant', () => {
  it('should be the string "__tag"', () => {
    expect(TAG).toBe('__tag')
  })
})

describe('withTag()', () => {
  it('should return a new reference', () => {
    const original = { name: 'test' }
    const tagged = withTag(original, 'Foo')
    expect(tagged).not.toBe(original)
  })

  it('should preserve all own enumerable properties', () => {
    const original = { a: 1, b: 'two', c: true }
    const tagged = withTag(original, 'Bar')
    expect(tagged.a).toBe(1)
    expect(tagged.b).toBe('two')
    expect(tagged.c).toBeTruthy()
  })

  it('should set TAG as non-enumerable', () => {
    const tagged = withTag({ x: 1 }, 'Test')
    expect(Object.keys(tagged)).toStrictEqual(['x'])
  })

  it('should not appear in JSON.stringify output', () => {
    const tagged = withTag({ x: 1 }, 'Test')
    const json = JSON.stringify(tagged)
    expect(json).toBe('{"x":1}')
  })

  it('should not be copied by spread', () => {
    const tagged = withTag({ x: 1 }, 'Test')
    const spread = { ...tagged }
    expect(hasTag(spread, 'Test')).toBeFalsy()
  })

  it('should be readable via TAG symbol', () => {
    const tagged = withTag({ x: 1 }, 'MyTag')
    expect(tagged[TAG]).toBe('MyTag')
  })

  it('should not mutate the original object', () => {
    const original = { x: 1 }
    withTag(original, 'Tag')
    expect((original as Record<symbol, unknown>)[TAG]).toBeUndefined()
  })
})

describe('hasTag()', () => {
  it('should return true for matching tag', () => {
    const tagged = withTag({}, 'Match')
    expect(hasTag(tagged, 'Match')).toBeTruthy()
  })

  it('should return false for mismatched tag', () => {
    const tagged = withTag({}, 'One')
    expect(hasTag(tagged, 'Two')).toBeFalsy()
  })

  it('should return false for null', () => {
    expect(hasTag(null, 'Any')).toBeFalsy()
  })

  it('should return false for undefined', () => {
    expect(hasTag(undefined, 'Any')).toBeFalsy()
  })

  it('should return false for primitives', () => {
    expect(hasTag(42, 'Num')).toBeFalsy()
    expect(hasTag('str', 'Str')).toBeFalsy()
    expect(hasTag(true, 'Bool')).toBeFalsy()
  })

  it('should return false for untagged objects', () => {
    expect(hasTag({}, 'Missing')).toBeFalsy()
  })
})

describe('getTag()', () => {
  it('should return tag string for tagged object', () => {
    const tagged = withTag({}, 'Hello')
    expect(getTag(tagged)).toBe('Hello')
  })

  it('should return undefined for untagged object', () => {
    expect(getTag({})).toBeUndefined()
  })

  it('should return undefined for null', () => {
    expect(getTag(null)).toBeUndefined()
  })

  it('should return undefined for undefined', () => {
    expect(getTag(undefined)).toBeUndefined()
  })

  it('should return undefined for primitives', () => {
    expect(getTag(42)).toBeUndefined()
    expect(getTag('str')).toBeUndefined()
  })
})

describe('ts-pattern integration', () => {
  it('should match tagged objects via computed TAG key', () => {
    const tagged = withTag({ value: 42 }, 'Foo')
    const result = match(tagged)
      .with({ [TAG]: 'Foo' }, (t) => t.value)
      .with({ [TAG]: P.string }, () => -1)
      .exhaustive()
    expect(result).toBe(42)
  })

  it('should distinguish between different tags', () => {
    const a = withTag({ kind: 'a' }, 'Alpha')
    const b = withTag({ kind: 'b' }, 'Beta')

    const check = (val: typeof a | typeof b): string =>
      match(val)
        .with({ [TAG]: 'Alpha' }, () => 'matched-alpha')
        .with({ [TAG]: 'Beta' }, () => 'matched-beta')
        .exhaustive()

    expect(check(a)).toBe('matched-alpha')
    expect(check(b)).toBe('matched-beta')
  })
})
