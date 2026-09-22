import { match } from 'ts-pattern'

/**
 * A zero-based point in terminal or surface coordinates.
 */
export interface InteractionPoint {
  readonly x: number
  readonly y: number
}

/**
 * A rectangular region with exclusive right and bottom edges.
 */
export interface InteractionRect extends InteractionPoint {
  readonly height: number
  readonly width: number
}

/**
 * An ancestor clip applied on selected terminal axes.
 */
export interface InteractionClip {
  readonly horizontal: boolean
  readonly rect: InteractionRect
  readonly vertical: boolean
}

/**
 * A target painted into an interaction hit-grid frame.
 */
export interface InteractionTarget {
  readonly clips?: readonly InteractionClip[]
  readonly disabled: boolean
  readonly id: string
  readonly rect: InteractionRect
}

/**
 * Cell ownership produced alongside one complete rendered frame.
 */
export interface InteractionHitGrid {
  readonly cells: readonly (InteractionTarget | null)[]
  readonly height: number
  readonly width: number
}

/**
 * Atomic access to the last complete interaction frame.
 */
export interface InteractionHitGridStore {
  readonly commit: (frame: InteractionHitGrid) => void
  readonly resolve: (point: InteractionPoint) => InteractionTarget | null
}

/**
 * Convert a viewport point into coordinates local to an interaction surface.
 *
 * @param options - Viewport point and the surface's known viewport origin.
 * @returns A frozen point relative to the surface.
 */
export function toSurfacePoint({
  origin,
  point,
}: {
  readonly origin: InteractionPoint
  readonly point: InteractionPoint
}): InteractionPoint {
  return Object.freeze({ x: point.x - origin.x, y: point.y - origin.y })
}

/**
 * Test whether a point lies inside a measured interaction rectangle.
 *
 * @param options - Point and rectangle in the same coordinate space.
 * @returns Whether the point is inside the rectangle.
 */
export function containsInteractionPoint({
  point,
  rect,
}: {
  readonly point: InteractionPoint
  readonly rect: InteractionRect
}): boolean {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height
  )
}

/**
 * Paint target ownership into a complete immutable terminal-cell grid.
 *
 * Targets must be provided in the same order Ink paints them. Later targets
 * overwrite earlier ownership, while nested clip rectangles restrict which
 * cells a target can own.
 *
 * @param options - Frame dimensions and targets in renderer paint order.
 * @returns A complete hit-grid frame ready for atomic publication.
 */
export function createInteractionHitGrid({
  height,
  targets,
  width,
}: {
  readonly height: number
  readonly targets: readonly InteractionTarget[]
  readonly width: number
}): InteractionHitGrid {
  const frameWidth = normalizeDimension(width)
  const frameHeight = normalizeDimension(height)
  const cells = Array.from({ length: frameWidth * frameHeight }, (_, index) => {
    const point = Object.freeze({
      x: index % frameWidth,
      y: Math.floor(index / frameWidth),
    })
    return targets.findLast((target) => ownsInteractionPoint({ point, target })) ?? null
  })

  return Object.freeze({ cells: Object.freeze(cells), height: frameHeight, width: frameWidth })
}

/**
 * Resolve the target owning a cell in a completed hit-grid frame.
 *
 * @param options - Completed frame and a point in its coordinate space.
 * @returns The cell owner, or `null` outside the frame and on unowned cells.
 */
export function resolveInteractionTarget({
  frame,
  point,
}: {
  readonly frame: InteractionHitGrid
  readonly point: InteractionPoint
}): InteractionTarget | null {
  if (
    !Number.isInteger(point.x) ||
    !Number.isInteger(point.y) ||
    point.x < 0 ||
    point.x >= frame.width ||
    point.y < 0 ||
    point.y >= frame.height
  ) {
    return null
  }

  return frame.cells[point.y * frame.width + point.x] ?? null
}

/**
 * Create an atomic store that never exposes a partially built hit grid.
 *
 * Build the next frame independently, then commit it from Ink's `onRender`
 * callback after layout and output generation complete.
 *
 * @param options - Initial completed frame.
 * @returns A frozen frame publication boundary.
 */
export function createInteractionHitGridStore({
  frame,
}: {
  readonly frame: InteractionHitGrid
}): InteractionHitGridStore {
  const frames = new Map([['current', frame] as const])

  return Object.freeze({
    commit: (nextFrame: InteractionHitGrid) => frames.set('current', nextFrame),
    resolve: (point: InteractionPoint) =>
      resolveInteractionTarget({ frame: frames.get('current') ?? frame, point }),
  })
}

/**
 * Normalize invalid frame dimensions to an empty axis.
 *
 * @private
 * @param dimension - Requested terminal axis length.
 * @returns A safe non-negative integer axis length.
 */
function normalizeDimension(dimension: number): number {
  return match(dimension)
    .when(
      (value) => Number.isSafeInteger(value) && value > 0,
      (value) => value
    )
    .otherwise(() => 0)
}

/**
 * Determine whether a target paints one cell after applying every clip.
 *
 * @private
 * @param options - Candidate target and cell point.
 * @returns Whether the target owns the cell.
 */
function ownsInteractionPoint({
  point,
  target,
}: {
  readonly point: InteractionPoint
  readonly target: InteractionTarget
}): boolean {
  if (target.disabled || !containsInteractionPoint({ point, rect: target.rect })) {
    return false
  }

  return (target.clips ?? []).every(
    (clip) =>
      (!clip.horizontal || (point.x >= clip.rect.x && point.x < clip.rect.x + clip.rect.width)) &&
      (!clip.vertical || (point.y >= clip.rect.y && point.y < clip.rect.y + clip.rect.height))
  )
}
