import { describe, expect, it } from 'vitest'

import type { InteractionTarget } from './hit-testing.js'
import {
  containsInteractionPoint,
  resolveInteractionTarget,
  toSurfacePoint,
} from './hit-testing.js'

const baseTarget: InteractionTarget = Object.freeze({
  disabled: false,
  id: 'base',
  priority: 0,
  rect: Object.freeze({ height: 3, width: 4, x: 2, y: 1 }),
})

describe(toSurfacePoint, () => {
  it('should translate viewport coordinates using an explicit origin', () => {
    expect(toSurfacePoint({ origin: { x: 10, y: 5 }, point: { x: 13, y: 9 } })).toStrictEqual({
      x: 3,
      y: 4,
    })
  })
})

describe(containsInteractionPoint, () => {
  it.each([
    { x: 2, y: 1 },
    { x: 5, y: 1 },
    { x: 2, y: 3 },
    { x: 5, y: 3 },
  ])('should include rectangle edge point $x,$y', (point) => {
    expect(containsInteractionPoint({ point, rect: baseTarget.rect })).toBeTruthy()
  })

  it.each([
    { x: 1, y: 1 },
    { x: 6, y: 1 },
    { x: 2, y: 0 },
    { x: 2, y: 4 },
  ])('should exclude point $x,$y outside the rectangle', (point) => {
    expect(containsInteractionPoint({ point, rect: baseTarget.rect })).toBeFalsy()
  })
})

describe(resolveInteractionTarget, () => {
  it('should ignore disabled targets', () => {
    expect(
      resolveInteractionTarget({
        point: { x: 2, y: 1 },
        targets: [{ ...baseTarget, disabled: true }],
      })
    ).toBeNull()
  })

  it('should choose the highest-priority overlapping target', () => {
    const foreground = { ...baseTarget, id: 'foreground', priority: 2 }

    expect(
      resolveInteractionTarget({ point: { x: 2, y: 1 }, targets: [foreground, baseTarget] })?.id
    ).toBe('foreground')
  })

  it('should choose the latest target when overlap priorities match', () => {
    const latest = { ...baseTarget, id: 'latest' }

    expect(
      resolveInteractionTarget({ point: { x: 2, y: 1 }, targets: [baseTarget, latest] })?.id
    ).toBe('latest')
  })
})
