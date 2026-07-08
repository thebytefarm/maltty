import type { Key } from 'ink'
import { describe, expect, it } from 'vitest'

import { matchesSequence, matchesSingleKey, normalizeKey, parseKeyPattern } from './keys.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    home: false,
    end: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    super: false,
    hyper: false,
    capsLock: false,
    numLock: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Normalize key
// ---------------------------------------------------------------------------

describe('normalize key', () => {
  it('should normalize character input to the character itself', () => {
    const result = normalizeKey('q', createKey())
    expect(result.key).toBe('q')
  })

  it('should normalize space input to "space"', () => {
    const result = normalizeKey(' ', createKey())
    expect(result.key).toBe('space')
  })

  it('should normalize escape key', () => {
    const result = normalizeKey('', createKey({ escape: true }))
    expect(result.key).toBe('escape')
  })

  it('should normalize return key', () => {
    const result = normalizeKey('', createKey({ return: true }))
    expect(result.key).toBe('return')
  })

  it('should normalize arrow keys', () => {
    expect(normalizeKey('', createKey({ upArrow: true })).key).toBe('up')
    expect(normalizeKey('', createKey({ downArrow: true })).key).toBe('down')
    expect(normalizeKey('', createKey({ leftArrow: true })).key).toBe('left')
    expect(normalizeKey('', createKey({ rightArrow: true })).key).toBe('right')
  })

  it('should normalize tab key', () => {
    const result = normalizeKey('', createKey({ tab: true }))
    expect(result.key).toBe('tab')
  })

  it('should normalize backspace key', () => {
    const result = normalizeKey('', createKey({ backspace: true }))
    expect(result.key).toBe('backspace')
  })

  it('should normalize pageup and pagedown keys', () => {
    expect(normalizeKey('', createKey({ pageUp: true })).key).toBe('pageup')
    expect(normalizeKey('', createKey({ pageDown: true })).key).toBe('pagedown')
  })

  it('should preserve modifier flags', () => {
    const result = normalizeKey('c', createKey({ ctrl: true }))
    expect(result.ctrl).toBeTruthy()
    expect(result.meta).toBeFalsy()
    expect(result.shift).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// Parse key pattern
// ---------------------------------------------------------------------------

describe('parse key pattern', () => {
  it('should parse a single character key', () => {
    const result = parseKeyPattern('q')
    expect(result).toEqual({
      type: 'single',
      key: 'q',
      ctrl: false,
      meta: false,
      shift: false,
    })
  })

  it('should parse a special key name', () => {
    const result = parseKeyPattern('escape')
    expect(result).toEqual({
      type: 'single',
      key: 'escape',
      ctrl: false,
      meta: false,
      shift: false,
    })
  })

  it('should parse ctrl+key modifier pattern', () => {
    const result = parseKeyPattern('ctrl+c')
    expect(result).toEqual({
      type: 'single',
      key: 'c',
      ctrl: true,
      meta: false,
      shift: false,
    })
  })

  it('should parse meta+key modifier pattern', () => {
    const result = parseKeyPattern('meta+s')
    expect(result).toEqual({
      type: 'single',
      key: 's',
      ctrl: false,
      meta: true,
      shift: false,
    })
  })

  it('should parse shift+tab modifier pattern', () => {
    const result = parseKeyPattern('shift+tab')
    expect(result).toEqual({
      type: 'single',
      key: 'tab',
      ctrl: false,
      meta: false,
      shift: true,
    })
  })

  it('should parse a two-key sequence', () => {
    const result = parseKeyPattern('escape escape')
    expect(result).toEqual({
      type: 'sequence',
      steps: [
        { type: 'single', key: 'escape', ctrl: false, meta: false, shift: false },
        { type: 'single', key: 'escape', ctrl: false, meta: false, shift: false },
      ],
    })
  })
})

// ---------------------------------------------------------------------------
// Matches single key
// ---------------------------------------------------------------------------

describe('matches single key', () => {
  it('should match a simple key', () => {
    const pattern = { type: 'single' as const, key: 'q', ctrl: false, meta: false, shift: false }
    const event = { key: 'q', ctrl: false, meta: false, shift: false }
    expect(matchesSingleKey(pattern, event)).toBeTruthy()
  })

  it('should not match a different key', () => {
    const pattern = { type: 'single' as const, key: 'q', ctrl: false, meta: false, shift: false }
    const event = { key: 'w', ctrl: false, meta: false, shift: false }
    expect(matchesSingleKey(pattern, event)).toBeFalsy()
  })

  it('should match with modifier flags', () => {
    const pattern = { type: 'single' as const, key: 'c', ctrl: true, meta: false, shift: false }
    const event = { key: 'c', ctrl: true, meta: false, shift: false }
    expect(matchesSingleKey(pattern, event)).toBeTruthy()
  })

  it('should not match when modifier differs', () => {
    const pattern = { type: 'single' as const, key: 'c', ctrl: true, meta: false, shift: false }
    const event = { key: 'c', ctrl: false, meta: false, shift: false }
    expect(matchesSingleKey(pattern, event)).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// Matches sequence
// ---------------------------------------------------------------------------

describe('matches sequence', () => {
  const escPattern = {
    type: 'sequence' as const,
    steps: [
      { type: 'single' as const, key: 'escape', ctrl: false, meta: false, shift: false },
      { type: 'single' as const, key: 'escape', ctrl: false, meta: false, shift: false },
    ],
  }

  it('should match a valid sequence within timeout', () => {
    const history = [
      { key: 'escape', ctrl: false, meta: false, shift: false, timestamp: 100 },
      { key: 'escape', ctrl: false, meta: false, shift: false, timestamp: 200 },
    ]
    expect(matchesSequence(escPattern, history, 300)).toBeTruthy()
  })

  it('should not match when sequence exceeds timeout', () => {
    const history = [
      { key: 'escape', ctrl: false, meta: false, shift: false, timestamp: 100 },
      { key: 'escape', ctrl: false, meta: false, shift: false, timestamp: 500 },
    ]
    expect(matchesSequence(escPattern, history, 300)).toBeFalsy()
  })

  it('should not match when history is too short', () => {
    const history = [{ key: 'escape', ctrl: false, meta: false, shift: false, timestamp: 100 }]
    expect(matchesSequence(escPattern, history, 300)).toBeFalsy()
  })

  it('should not match when keys differ', () => {
    const history = [
      { key: 'q', ctrl: false, meta: false, shift: false, timestamp: 100 },
      { key: 'escape', ctrl: false, meta: false, shift: false, timestamp: 200 },
    ]
    expect(matchesSequence(escPattern, history, 300)).toBeFalsy()
  })
})
