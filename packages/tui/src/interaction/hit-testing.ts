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
 * A candidate interaction target and its deterministic overlap priority.
 */
export interface InteractionTarget {
  readonly disabled: boolean
  readonly id: string
  readonly priority: number
  readonly rect: InteractionRect
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
 * Resolve the enabled target under a point using priority and mount order.
 *
 * Higher priority wins. When priorities match, the later target wins so a
 * registry can use immutable append order as its initial stacking model.
 *
 * @param options - Registered targets and a point in surface coordinates.
 * @returns The winning target, or `null` when no target contains the point.
 */
export function resolveInteractionTarget({
  point,
  targets,
}: {
  readonly point: InteractionPoint
  readonly targets: readonly InteractionTarget[]
}): InteractionTarget | null {
  return targets.reduce<InteractionTarget | null>((resolved, target) => {
    if (target.disabled || !containsInteractionPoint({ point, rect: target.rect })) {
      return resolved
    }
    if (resolved === null || target.priority >= resolved.priority) {
      return target
    }
    return resolved
  }, null)
}
