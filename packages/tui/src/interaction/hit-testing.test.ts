import { describe, expect, it } from 'vitest'

import type { InteractionTarget } from './hit-testing.js'
import {
  containsInteractionPoint,
  createInteractionHitGrid,
  createInteractionHitGridStore,
  resolveInteractionTarget,
  toSurfacePoint,
} from './hit-testing.js'

const baseTarget: InteractionTarget = Object.freeze({
  disabled: false,
  id: 'base',
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

describe(createInteractionHitGrid, () => {
  it('should paint complete target rectangles into terminal cells', () => {
    const frame = createInteractionHitGrid({ height: 5, targets: [baseTarget], width: 7 })

    expect(resolveInteractionTarget({ frame, point: { x: 2, y: 1 } })?.id).toBe('base')
    expect(resolveInteractionTarget({ frame, point: { x: 5, y: 3 } })?.id).toBe('base')
    expect(resolveInteractionTarget({ frame, point: { x: 6, y: 3 } })).toBeNull()
  })

  it('should let later paint order overwrite earlier ownership', () => {
    const foreground = { ...baseTarget, id: 'foreground' }
    const frame = createInteractionHitGrid({
      height: 5,
      targets: [baseTarget, foreground],
      width: 7,
    })

    expect(resolveInteractionTarget({ frame, point: { x: 2, y: 1 } })?.id).toBe('foreground')
  })

  it('should restrict ownership to every active clip rectangle', () => {
    const clipped = {
      ...baseTarget,
      clips: [
        {
          horizontal: true,
          rect: { height: 2, width: 2, x: 3, y: 2 },
          vertical: true,
        },
      ],
    }
    const frame = createInteractionHitGrid({ height: 5, targets: [clipped], width: 7 })

    expect(resolveInteractionTarget({ frame, point: { x: 3, y: 2 } })?.id).toBe('base')
    expect(resolveInteractionTarget({ frame, point: { x: 2, y: 1 } })).toBeNull()
  })

  it('should ignore disabled targets', () => {
    const frame = createInteractionHitGrid({
      height: 5,
      targets: [{ ...baseTarget, disabled: true }],
      width: 7,
    })

    expect(resolveInteractionTarget({ frame, point: { x: 2, y: 1 } })).toBeNull()
  })

  it('should reject coordinates outside the completed frame', () => {
    const frame = createInteractionHitGrid({ height: 5, targets: [baseTarget], width: 7 })

    expect(resolveInteractionTarget({ frame, point: { x: -1, y: 1 } })).toBeNull()
    expect(resolveInteractionTarget({ frame, point: { x: 7, y: 1 } })).toBeNull()
  })
})

describe(createInteractionHitGridStore, () => {
  it('should publish only explicitly committed complete frames', () => {
    const initial = createInteractionHitGrid({ height: 5, targets: [baseTarget], width: 7 })
    const next = createInteractionHitGrid({
      height: 5,
      targets: [{ ...baseTarget, id: 'next' }],
      width: 7,
    })
    const store = createInteractionHitGridStore({ frame: initial })

    expect(store.resolve({ x: 2, y: 1 })?.id).toBe('base')

    store.commit(next)

    expect(store.resolve({ x: 2, y: 1 })?.id).toBe('next')
  })
})
