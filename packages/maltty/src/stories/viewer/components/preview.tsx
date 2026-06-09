import type { DOMElement } from 'ink'
import { Box, Text } from 'ink'
import type { ComponentType, ReactElement } from 'react'
import { useMemo, useRef } from 'react'
import { match } from 'ts-pattern'

import { ScrollArea } from '../../../ui/layout/scroll-area.js'
import { useSize } from '../../../ui/layout/use-size.js'
import type { FieldDescriptor, Story } from '../../types.js'
import type { FieldError } from '../../validate.js'
import { applyDecorators } from '../utils.js'
import { EmptyState } from './empty-state.js'
import { ErrorBoundary } from './error-boundary.js'
import { PropsEditor } from './props-editor.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum rows allocated to the props editor area. */
const MIN_PROPS_ROWS = 6

/** Maximum rows allocated to the props editor area. */
const MAX_PROPS_ROWS = 14

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Contextual metadata for the preview header display.
 */
export interface PreviewContext {
  readonly filePath: string
  readonly displayName: string
  readonly description: string | undefined
}

/**
 * Props for the {@link Preview} component.
 */
interface PreviewProps {
  readonly story: Story | null
  readonly currentProps: Record<string, unknown>
  readonly context: PreviewContext | null
  readonly fields: readonly FieldDescriptor[]
  readonly errors: readonly FieldError[]
  readonly onPropsChange: (name: string, value: unknown) => void
  readonly isFocused: boolean
  readonly editable?: boolean
  readonly borderless?: boolean
  readonly interactive?: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Preview panel that renders the selected story component with the current
 * props and an inline props editor. Shows the qualified story name, file path,
 * and description above the rendered component. The props editor is inset
 * below the component with a dotted separator. Both the component area and
 * the props editor are independently scrollable to prevent overflow.
 * Applies decorators in order and wraps the result in an
 * {@link ErrorBoundary} to catch render errors.
 *
 * @param props - The preview props.
 * @returns A rendered preview element.
 */
export function Preview({
  story,
  currentProps,
  context,
  fields,
  errors,
  onPropsChange,
  isFocused,
  editable = false,
  borderless = false,
  interactive = false,
}: PreviewProps): ReactElement {
  const contentRef = useRef<DOMElement>(null)
  const { height: contentHeight } = useSize(contentRef)
  const { componentAreaHeight, propsAreaHeight } = useMemo(
    () => splitContentHeight(contentHeight),
    [contentHeight]
  )

  const DecoratedComponent = useMemo(() => {
    if (story === null) {
      return null
    }
    return applyDecorators(
      story.component as ComponentType<Record<string, unknown>>,
      story.decorators
    )
  }, [story])

  if (story === null || context === null || DecoratedComponent === null) {
    return (
      <Box
        borderStyle={match(borderless)
          .with(true, () => undefined)
          .with(false, () => 'single' as const)
          .exhaustive()}
        borderDimColor={!borderless}
        flexDirection="column"
        flexGrow={1}
        overflow="hidden"
      >
        <Box paddingX={1}>
          <Text bold dimColor>
            Preview
          </Text>
        </Box>
        <EmptyState />
      </Box>
    )
  }

  if (interactive) {
    return (
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        <ErrorBoundary key={context.displayName}>
          <DecoratedComponent {...currentProps} />
        </ErrorBoundary>
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
      borderStyle={match(borderless)
        .with(true, () => undefined)
        .with(false, () => 'single' as const)
        .exhaustive()}
      borderDimColor={match(borderless)
        .with(true, () => false)
        .with(false, () => !isFocused)
        .exhaustive()}
      borderColor={match({ isFocused, borderless })
        .with({ borderless: true }, () => undefined)
        .with({ isFocused: true }, () => 'cyan' as const)
        .otherwise(() => undefined)}
      paddingX={1}
    >
      <PreviewHeader context={context} />
      <Box ref={contentRef} flexDirection="column" flexGrow={1}>
        <ScrollArea height={Math.max(1, componentAreaHeight)}>
          <ErrorBoundary key={context.displayName}>
            <DecoratedComponent {...currentProps} focused={false} />
          </ErrorBoundary>
        </ScrollArea>
        <Box height={propsAreaHeight} overflow="hidden" flexDirection="column">
          <PropsEditor
            fields={fields}
            values={currentProps}
            errors={errors}
            onChange={onPropsChange}
            isFocused={editable}
          />
        </Box>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the preview header showing story name, file path, and description.
 * "Preview" is displayed as a bold section label, then the story name,
 * path, and optional description below.
 *
 * @private
 * @param props - The header props.
 * @returns A rendered header element.
 */
function PreviewHeader({ context }: { readonly context: PreviewContext }): ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold>Preview</Text>
      </Box>
      <Text bold>{context.displayName}</Text>
      <Text italic dimColor>
        {context.filePath}
      </Text>
      <StoryDescription description={context.description} />
    </Box>
  )
}

/**
 * Render a story description when available, or nothing when absent.
 *
 * @private
 * @param props - The component props.
 * @returns A rendered description element or null.
 */
function StoryDescription({
  description,
}: {
  readonly description: string | undefined
}): ReactElement | null {
  if (description === undefined) {
    return null
  }
  return (
    <Text dimColor italic>
      {description}
    </Text>
  )
}

/**
 * Split the measured content area height between the component preview
 * and the props editor. The props editor receives up to 45% of the
 * available space (clamped between {@link MIN_PROPS_ROWS} and
 * {@link MAX_PROPS_ROWS}). The component preview gets the remainder.
 *
 * @private
 * @param contentHeight - Total measured height of the content area.
 * @returns Frozen object with computed area heights.
 */
function splitContentHeight(contentHeight: number): {
  readonly componentAreaHeight: number
  readonly propsAreaHeight: number
} {
  const propsAreaHeight = Math.min(
    Math.max(MIN_PROPS_ROWS, Math.floor(contentHeight * 0.45)),
    MAX_PROPS_ROWS
  )
  const componentAreaHeight = Math.max(1, contentHeight - propsAreaHeight)
  return Object.freeze({ componentAreaHeight, propsAreaHeight })
}
