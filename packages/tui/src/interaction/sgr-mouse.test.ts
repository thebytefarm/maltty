import { describe, expect, it } from 'vitest'

import { parseSgrMouse } from './sgr-mouse.js'

describe(parseSgrMouse, () => {
  it('should parse a raw left-button press with zero-based coordinates', () => {
    expect(parseSgrMouse('\u001B[<0;12;8M')).toStrictEqual([
      null,
      {
        button: 'left',
        modifiers: { alt: false, ctrl: false, shift: false },
        type: 'down',
        x: 11,
        y: 7,
      },
    ])
  })

  it('should parse an Ink input value without its escape prefix', () => {
    expect(parseSgrMouse('[<0;1;1M')[1]).toMatchObject({ type: 'down', x: 0, y: 0 })
  })

  it('should parse an 8-bit CSI sequence', () => {
    expect(parseSgrMouse('\u009B<0;1;1M')[1]).toMatchObject({ type: 'down', x: 0, y: 0 })
  })

  it('should parse release events', () => {
    expect(parseSgrMouse('\u001B[<2;4;3m')[1]).toMatchObject({ button: 'right', type: 'up' })
  })

  it('should parse modified drag events', () => {
    expect(parseSgrMouse('\u001B[<61;4;3M')[1]).toMatchObject({
      button: 'middle',
      modifiers: { alt: true, ctrl: true, shift: true },
      type: 'drag',
    })
  })

  it('should parse buttonless movement', () => {
    expect(parseSgrMouse('\u001B[<35;4;3M')[1]).toMatchObject({
      button: 'none',
      type: 'move',
    })
  })

  it.each([
    [64, 'up'],
    [65, 'down'],
    [66, 'left'],
    [67, 'right'],
  ] as const)('should parse wheel code %i as %s scrolling', (code, direction) => {
    expect(parseSgrMouse(`\u001B[<${code};4;3M`)[1]).toMatchObject({
      button: 'none',
      scroll: { delta: 1, direction },
      type: 'scroll',
    })
  })

  it('should preserve coordinates wider than the X10 byte range', () => {
    expect(parseSgrMouse('\u001B[<0;1200;800M')[1]).toMatchObject({ x: 1199, y: 799 })
  })

  it.each(['', '\u001B[<0;1', 'hello', '\u001B[<left;1;1M'])(
    'should reject malformed sequence %j',
    (input) => {
      expect(parseSgrMouse(input)[0]).toMatchObject({ type: 'invalid_sequence' })
    }
  )

  it('should reject zero coordinates', () => {
    expect(parseSgrMouse('\u001B[<0;0;1M')[0]).toMatchObject({ type: 'invalid_coordinates' })
  })

  it('should reject unsafe button codes', () => {
    expect(parseSgrMouse('\u001B[<999999999999999999999;1;1M')[0]).toMatchObject({
      type: 'invalid_code',
    })
  })

  it.each([128, 129, 130, 131])('should reject unsupported extended button code %i', (code) => {
    expect(parseSgrMouse(`\u001B[<${code};1;1M`)[0]).toMatchObject({ type: 'invalid_code' })
  })

  it('should reject a buttonless press', () => {
    expect(parseSgrMouse('\u001B[<3;1;1M')[0]).toMatchObject({ type: 'invalid_code' })
  })
})
