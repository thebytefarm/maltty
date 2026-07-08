import { Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import type { Variant } from '../theme.js'
import { resolveVariantColor, symbols } from '../theme.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The visual variant of an alert, determining color and icon.
 */
export type AlertVariant = Variant

/**
 * Props for the {@link Alert} component.
 */
export interface AlertProps {
  /** The text content to display inside the alert box. */
  readonly children: string

  /** The variant determines the border color and icon. */
  readonly variant: AlertVariant

  /** Optional title rendered in the top border. */
  readonly title?: string

  /** Box width. Defaults to `'auto'` which sizes to content. */
  readonly width?: number | 'auto'

  /** Use rounded border corners when `true`. */
  readonly rounded?: boolean

  /** Horizontal alignment of content lines. */
  readonly contentAlign?: 'left' | 'center' | 'right'

  /** Horizontal alignment of the title within the top border. */
  readonly titleAlign?: 'left' | 'center' | 'right'
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A bordered alert box with variant-colored borders and icon.
 *
 * Renders a box constructed from text characters with a colored border
 * matching the alert variant. An icon (from the theme symbols) is prepended
 * to the content. The title, when provided, is inset into the top border.
 *
 * @param props - The alert props.
 * @returns A rendered alert element.
 */
export function Alert({
  children,
  variant,
  title,
  width = 'auto',
  rounded = true,
  contentAlign = 'left',
  titleAlign = 'left',
}: AlertProps): ReactElement {
  const variantColor = resolveVariantColor(variant)
  const icon = resolveVariantIcon(variant)
  const border = resolveBorderChars(rounded)
  const contentStr = `${icon} ${children}`
  const innerWidth = resolveInnerWidth({ width, title, contentStr })
  const topLine = buildTopBorder({ border, title, innerWidth, titleAlign })
  const bottomLine = `${border.bottomLeft}${border.horizontal.repeat(innerWidth + 2)}${border.bottomRight}`
  const contentLines = buildContentLines({ contentStr, innerWidth, border, contentAlign })

  return <Text color={variantColor}>{`${topLine}\n${contentLines}\n${bottomLine}`}</Text>
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Border character set for box rendering.
 *
 * @private
 */
interface BorderChars {
  readonly topLeft: string
  readonly topRight: string
  readonly bottomLeft: string
  readonly bottomRight: string
  readonly horizontal: string
  readonly vertical: string
}

/**
 * Options for resolving the inner width of the alert box.
 *
 * @private
 */
interface InnerWidthOptions {
  readonly width: number | 'auto'
  readonly title: string | undefined
  readonly contentStr: string
}

/**
 * Options for building the top border line.
 *
 * @private
 */
interface TopBorderOptions {
  readonly border: BorderChars
  readonly title: string | undefined
  readonly innerWidth: number
  readonly titleAlign: 'left' | 'center' | 'right'
}

/**
 * Options for building content lines.
 *
 * @private
 */
interface ContentLineOptions {
  readonly contentStr: string
  readonly innerWidth: number
  readonly border: BorderChars
  readonly contentAlign: 'left' | 'center' | 'right'
}

/**
 * Resolve the icon symbol for a given alert variant.
 *
 * @private
 * @param variant - The alert variant.
 * @returns The icon string.
 */
function resolveVariantIcon(variant: AlertVariant): string {
  return match(variant)
    .with('info', () => symbols.info)
    .with('success', () => symbols.tick)
    .with('error', () => symbols.cross)
    .with('warning', () => symbols.warning)
    .exhaustive()
}

/**
 * Resolve the border character set based on the rounded flag.
 *
 * @private
 * @param rounded - Whether to use rounded corners.
 * @returns The border character set.
 */
function resolveBorderChars(rounded: boolean): BorderChars {
  return match(rounded)
    .with(true, () => ({
      topLeft: '\u256D',
      topRight: '\u256E',
      bottomLeft: '\u2570',
      bottomRight: '\u256F',
      horizontal: '\u2500',
      vertical: '\u2502',
    }))
    .with(false, () => ({
      topLeft: '\u250C',
      topRight: '\u2510',
      bottomLeft: '\u2514',
      bottomRight: '\u2518',
      horizontal: '\u2500',
      vertical: '\u2502',
    }))
    .exhaustive()
}

/**
 * Compute the inner width of the alert box (excluding border and padding).
 *
 * @private
 * @param options - The width resolution options.
 * @returns The inner width in characters.
 */
function resolveInnerWidth({ width, title, contentStr }: InnerWidthOptions): number {
  if (width !== 'auto') {
    return Math.max(0, width - 4)
  }
  const maxLineWidth = contentStr.split('\n').reduce((max, line) => Math.max(max, line.length), 0)
  const titleWidth = match(title)
    .with(undefined, () => 0)
    .otherwise((t) => t.length + 4)
  return Math.max(maxLineWidth, titleWidth)
}

/**
 * Build the top border string with an optional inset title.
 *
 * @private
 * @param options - The top border options.
 * @returns The top border string.
 */
function buildTopBorder({ border, title, innerWidth, titleAlign }: TopBorderOptions): string {
  if (!title) {
    return `${border.topLeft}${border.horizontal.repeat(innerWidth + 2)}${border.topRight}`
  }

  const titleSegment = ` ${title} `
  const remainingWidth = Math.max(0, innerWidth + 2 - titleSegment.length - 1)

  return match(titleAlign)
    .with(
      'left',
      () =>
        `${border.topLeft}${border.horizontal}${titleSegment}${border.horizontal.repeat(remainingWidth)}${border.topRight}`
    )
    .with(
      'right',
      () =>
        `${border.topLeft}${border.horizontal.repeat(remainingWidth)}${titleSegment}${border.horizontal}${border.topRight}`
    )
    .with('center', () => {
      const leftPad = Math.floor(remainingWidth / 2)
      const rightPad = remainingWidth - leftPad
      return `${border.topLeft}${border.horizontal.repeat(leftPad + 1)}${titleSegment}${border.horizontal.repeat(rightPad)}${border.topRight}`
    })
    .exhaustive()
}

/**
 * Build the padded content lines for the alert body.
 *
 * @private
 * @param options - The content line options.
 * @returns The formatted content lines as a single string.
 */
function buildContentLines({
  contentStr,
  innerWidth,
  border,
  contentAlign,
}: ContentLineOptions): string {
  return contentStr
    .split('\n')
    .map((line) => alignLine({ line, innerWidth, border, contentAlign }))
    .join('\n')
}

/**
 * Options for aligning a single content line.
 *
 * @private
 */
interface AlignLineOptions {
  readonly line: string
  readonly innerWidth: number
  readonly border: BorderChars
  readonly contentAlign: 'left' | 'center' | 'right'
}

/**
 * Align a single content line within the alert box.
 *
 * @private
 * @param options - The line alignment options.
 * @returns The aligned line with border characters.
 */
function alignLine({ line, innerWidth, border, contentAlign }: AlignLineOptions): string {
  const padding = Math.max(0, innerWidth - line.length)

  return match(contentAlign)
    .with('left', () => `${border.vertical} ${line}${' '.repeat(padding)} ${border.vertical}`)
    .with('right', () => `${border.vertical} ${' '.repeat(padding)}${line} ${border.vertical}`)
    .with('center', () => {
      const leftPad = Math.floor(padding / 2)
      const rightPad = padding - leftPad
      return `${border.vertical} ${' '.repeat(leftPad)}${line}${' '.repeat(rightPad)} ${border.vertical}`
    })
    .exhaustive()
}
