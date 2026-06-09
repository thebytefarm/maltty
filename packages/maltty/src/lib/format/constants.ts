import figures from 'figures'

/**
 * Shape of the Unicode glyphs object.
 */
export interface Glyphs {
  readonly check: string
  readonly cross: string
  readonly warning: string
  readonly dash: string
  readonly dot: string
  readonly arrow: string
  readonly skip: string
  readonly fix: string
  readonly pipe: string
  readonly corner: string
}

/**
 * Unicode glyphs used in formatted output, frozen for immutability.
 */
export const GLYPHS: Glyphs = Object.freeze({
  arrow: figures.pointerSmall,
  check: figures.tick,
  corner: figures.lineUpRight,
  cross: figures.cross,
  dash: figures.line,
  dot: figures.dot,
  fix: figures.lozenge,
  pipe: figures.lineVertical,
  skip: figures.circle,
  warning: figures.warning,
})
