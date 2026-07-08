import { Box, Text, useInput } from 'ink'
import type { ReactElement, ReactNode } from 'react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import { colors } from '../theme.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single tab definition with a label and content to render.
 */
export interface TabItem {
  readonly label: string
  readonly content: ReactNode
}

/**
 * Props for the {@link Tabs} component.
 */
export interface TabsProps {
  /** The tabs to render. */
  readonly tabs: readonly TabItem[]

  /** Whether the tab bar responds to keyboard input. */
  readonly isFocused: boolean

  /** Controlled active tab index. When omitted, the component manages its own state. */
  readonly activeTab?: number

  /** Callback fired when the active tab changes. */
  readonly onTabChange?: (index: number) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Horizontal tab bar with keyboard navigation and content switching.
 *
 * Renders a row of tab labels at the top, with the active tab highlighted
 * in cyan and underlined. The corresponding tab content is rendered below.
 * Supports both controlled and uncontrolled modes via `activeTab` and
 * `onTabChange`.
 *
 * **Keyboard shortcuts** (when `isFocused` is `true`):
 * - Tab key — cycle to next tab (wraps around)
 * - Left/Right arrows — move between tabs
 *
 * @param props - The tabs component props.
 * @returns A rendered tabs element.
 */
export function Tabs({ tabs, isFocused, activeTab, onTabChange }: TabsProps): ReactElement {
  const isControlled = activeTab !== undefined
  const [internalIndex, setInternalIndex] = useState(0)
  const resolvedIndex = match(isControlled)
    .with(true, () => activeTab ?? 0)
    .with(false, () => internalIndex)
    .exhaustive()
  const currentIndex = clampIndex(resolvedIndex, tabs.length)

  useInput(
    (_input, key) => {
      if (tabs.length === 0) {
        return
      }

      const nextIndex = resolveNextIndex({ key, currentIndex, tabCount: tabs.length })
      if (nextIndex === currentIndex) {
        return
      }

      if (!isControlled) {
        setInternalIndex(nextIndex)
      }
      if (onTabChange) {
        onTabChange(nextIndex)
      }
    },
    { isActive: isFocused }
  )

  if (tabs.length === 0) {
    return <Box />
  }

  const activeContent = tabs[currentIndex]

  return (
    <Box flexDirection="column" flexGrow={1}>
      <TabBar tabs={tabs} activeIndex={currentIndex} isFocused={isFocused} />
      <Box flexDirection="column" flexGrow={1}>
        {match(activeContent)
          .with(undefined, () => null)
          .otherwise((tab) => tab.content)}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link TabBar} component.
 *
 * @private
 */
interface TabBarProps {
  readonly tabs: readonly TabItem[]
  readonly activeIndex: number
  readonly isFocused: boolean
}

/**
 * Render the horizontal tab label row with a navigation hint.
 *
 * @private
 * @param props - The tab bar props.
 * @returns A rendered tab bar element.
 */
function TabBar({ tabs, activeIndex, isFocused }: TabBarProps): ReactElement {
  return (
    <Box flexDirection="column">
      <Box gap={2}>
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex
          return (
            <TabLabel key={tab.label} label={tab.label} isActive={isActive} isFocused={isFocused} />
          )
        })}
        {match(isFocused)
          .with(true, () => <Text dimColor>| tab/←→</Text>)
          .with(false, () => null)
          .exhaustive()}
      </Box>
    </Box>
  )
}

/**
 * Props for the {@link TabLabel} component.
 *
 * @private
 */
interface TabLabelProps {
  readonly label: string
  readonly isActive: boolean
  readonly isFocused: boolean
}

/**
 * Render a single tab label with active styling and underline indicator.
 *
 * @private
 * @param props - The tab label props.
 * @returns A rendered tab label element.
 */
function TabLabel({ label, isActive, isFocused }: TabLabelProps): ReactElement {
  const color = resolveTabColor(isActive, isFocused)

  return (
    <Text dimColor={!isActive} color={color} bold={isActive} underline={isActive}>
      {label}
    </Text>
  )
}

/**
 * Resolve the color for a tab label based on its active and focus state.
 *
 * @private
 * @param isActive - Whether this tab is the active tab.
 * @param isFocused - Whether the tabs component is focused.
 * @returns The color string, or undefined for default.
 */
function resolveTabColor(isActive: boolean, isFocused: boolean): string | undefined {
  return match({ isActive, isFocused })
    .with({ isActive: true, isFocused: true }, () => colors.primary)
    .with({ isActive: true, isFocused: false }, () => 'white' as const)
    .otherwise(() => undefined)
}

/**
 * Input resolution options for keyboard navigation.
 *
 * @private
 */
interface InputOptions {
  readonly key: {
    readonly leftArrow: boolean
    readonly rightArrow: boolean
    readonly tab: boolean
  }
  readonly currentIndex: number
  readonly tabCount: number
}

/**
 * Compute the next tab index from a keyboard input event. Supports
 * left/right arrows for directional movement and Tab to cycle forward
 * (wrapping from last to first).
 *
 * @private
 * @param options - The input resolution options.
 * @returns The next tab index.
 */
function resolveNextIndex({ key, currentIndex, tabCount }: InputOptions): number {
  if (key.tab) {
    return (currentIndex + 1) % tabCount
  }
  if (key.leftArrow) {
    return Math.max(0, currentIndex - 1)
  }
  if (key.rightArrow) {
    return Math.min(tabCount - 1, currentIndex + 1)
  }

  return currentIndex
}

/**
 * Clamp an index to valid bounds for the given tab count.
 *
 * @private
 * @param index - The index to clamp.
 * @param count - The total number of tabs.
 * @returns The clamped index.
 */
function clampIndex(index: number, count: number): number {
  if (count === 0) {
    return 0
  }
  return Math.max(0, Math.min(count - 1, index))
}
