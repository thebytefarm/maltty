import { Box, Text } from 'ink'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ScrollArea} component.
 */
export interface ScrollAreaProps {
  /**
   * The content to render inside the scrollable area.
   * Each direct child is treated as one logical row.
   */
  readonly children: ReactNode

  /**
   * Maximum number of visible rows in the viewport.
   * When the child count exceeds this, the area becomes scrollable.
   */
  readonly height: number

  /**
   * Index of the currently highlighted/active item. When provided,
   * the scroll offset automatically adjusts to keep this item visible.
   */
  readonly activeIndex?: number

  /**
   * Total number of items (used for scroll indicator calculations).
   * Defaults to `React.Children.count(children)` when not provided.
   */
  readonly itemCount?: number

  /**
   * When `true`, renders a scroll position indicator on the right edge.
   *
   * @default false
   */
  readonly showIndicator?: boolean

  /**
   * Controlled scroll offset. When provided, the component does not
   * manage its own offset state.
   */
  readonly scrollOffset?: number

  /**
   * Callback fired when the scroll offset changes. Useful for
   * controlled mode or syncing external state.
   */
  readonly onScrollChange?: (offset: number) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A vertically scrollable container that clips content to a fixed height
 * and auto-scrolls to keep the active item in view.
 *
 * Uses Ink's `overflow="hidden"` for clipping and slices children to the
 * visible window. Optionally renders a scroll indicator showing relative
 * position within the list.
 *
 * @param props - The scroll area props.
 * @returns A rendered scroll area element.
 */
export function ScrollArea({
  children,
  height,
  activeIndex,
  itemCount,
  showIndicator = false,
  scrollOffset: controlledOffset,
  onScrollChange,
}: ScrollAreaProps): ReactElement {
  const childArray = flattenChildren(children)
  const totalItems = itemCount ?? childArray.length
  const isControlled = controlledOffset !== undefined

  const [internalOffset, setInternalOffset] = useState(0)
  const offset = resolveOffset(isControlled, controlledOffset, internalOffset)

  useEffect(() => {
    if (activeIndex === undefined) {
      return
    }
    const newOffset = clampOffset({
      activeIndex,
      currentOffset: offset,
      height,
      totalItems,
    })
    if (newOffset === offset) {
      return
    }
    if (!isControlled) {
      setInternalOffset(newOffset)
    }
    if (onScrollChange) {
      onScrollChange(newOffset)
    }
  }, [activeIndex, height, totalItems, offset, isControlled, onScrollChange])

  const visibleChildren = childArray.slice(offset, offset + height)

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" overflow="hidden" height={height}>
        {visibleChildren}
      </Box>
      {match(showIndicator && totalItems > height)
        .with(true, () => (
          <ScrollIndicator offset={offset} height={height} totalItems={totalItems} />
        ))
        .with(false, () => null)
        .exhaustive()}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ScrollIndicator} component.
 *
 * @private
 */
interface ScrollIndicatorProps {
  readonly offset: number
  readonly height: number
  readonly totalItems: number
}

/**
 * Render a vertical scroll indicator showing the current viewport
 * position within the full list.
 *
 * @private
 * @param props - The indicator props.
 * @returns A rendered scroll indicator column.
 */
function ScrollIndicator({ offset, height, totalItems }: ScrollIndicatorProps): ReactElement {
  const thumbSize = Math.max(1, Math.round((height / totalItems) * height))
  const maxThumbOffset = height - thumbSize
  const scrollRange = totalItems - height
  const thumbOffset = computeThumbOffset(scrollRange, offset, maxThumbOffset)

  return (
    <Box flexDirection="column" marginLeft={1}>
      {Array.from({ length: height }, (_, i) => {
        const isThumb = i >= thumbOffset && i < thumbOffset + thumbSize
        return (
          <Text key={i} dimColor={!isThumb}>
            {match(isThumb)
              .with(true, () => '┃')
              .with(false, () => '│')
              .exhaustive()}
          </Text>
        )
      })}
    </Box>
  )
}

/**
 * Options for computing a clamped scroll offset.
 *
 * @private
 */
interface ClampOffsetOptions {
  readonly activeIndex: number
  readonly currentOffset: number
  readonly height: number
  readonly totalItems: number
}

/**
 * Resolve the effective scroll offset, preferring the controlled value
 * when the component is in controlled mode.
 *
 * @private
 * @param isControlled - Whether the component is in controlled mode.
 * @param controlledOffset - The externally provided offset.
 * @param internalOffset - The internally managed offset.
 * @returns The resolved offset.
 */
function resolveOffset(
  isControlled: boolean,
  controlledOffset: number | undefined,
  internalOffset: number
): number {
  if (isControlled && controlledOffset !== undefined) {
    return controlledOffset
  }
  return internalOffset
}

/**
 * Compute the thumb position within the scroll indicator track.
 * Returns 0 when the scroll range is zero (no scrolling possible).
 *
 * @private
 * @param scrollRange - Total scrollable range.
 * @param offset - Current scroll offset.
 * @param maxThumbOffset - Maximum thumb position.
 * @returns The thumb offset position.
 */
function computeThumbOffset(scrollRange: number, offset: number, maxThumbOffset: number): number {
  if (scrollRange <= 0) {
    return 0
  }
  return Math.round((offset / scrollRange) * maxThumbOffset)
}

/**
 * Compute a new scroll offset that keeps `activeIndex` within the
 * visible viewport. Returns `currentOffset` unchanged when the
 * active item is already visible.
 *
 * @private
 * @param options - The clamp calculation inputs.
 * @returns The clamped scroll offset.
 */
function clampOffset({
  activeIndex,
  currentOffset,
  height,
  totalItems,
}: ClampOffsetOptions): number {
  const maxOffset = Math.max(0, totalItems - height)

  if (activeIndex < currentOffset) {
    return Math.max(0, activeIndex)
  }

  if (activeIndex >= currentOffset + height) {
    return Math.min(maxOffset, activeIndex - height + 1)
  }

  return Math.min(currentOffset, maxOffset)
}

/**
 * Flatten React children into an array of ReactNode elements.
 * Handles arrays, fragments, and single children uniformly.
 *
 * @private
 * @param children - The React children to flatten.
 * @returns A flat array of child nodes.
 */
function flattenChildren(children: ReactNode): readonly ReactNode[] {
  if (children === null || children === undefined) {
    return []
  }
  if (Array.isArray(children)) {
    return children.flat()
  }
  return [children]
}
