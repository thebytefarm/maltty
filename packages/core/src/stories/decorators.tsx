import { Box } from 'ink'
import type { ComponentType, ReactElement } from 'react'
import React from 'react'

import type { ScreenContext } from '../context/types.js'
import { MalttyProvider } from '../screen/provider.js'
import { FullScreen } from '../ui/layout/fullscreen.js'
import type { Decorator } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Layout options for the {@link withLayout} decorator.
 */
export interface LayoutOptions {
  readonly width?: number
  readonly padding?: number
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Wrap a story component in a {@link MalttyProvider} with the given screen context.
 * Required for components that use `useScreenContext()`.
 *
 * @param ctx - The screen context to provide.
 * @returns A decorator that wraps the story in a MalttyProvider.
 */
export function withContext(ctx: ScreenContext): Decorator {
  return (
    StoryComponent: ComponentType<Record<string, unknown>>
  ): ComponentType<Record<string, unknown>> => {
    /**
     * @private
     */
    function ContextWrapper(props: Record<string, unknown>): ReactElement {
      return (
        <MalttyProvider value={ctx}>
          <StoryComponent {...props} />
        </MalttyProvider>
      )
    }
    return ContextWrapper
  }
}

/**
 * Wrap a story component in a {@link FullScreen} alternate buffer.
 *
 * @returns A decorator that wraps the story in a FullScreen component.
 */
export function withFullScreen(): Decorator {
  return (
    StoryComponent: ComponentType<Record<string, unknown>>
  ): ComponentType<Record<string, unknown>> => {
    /**
     * @private
     */
    function FullScreenWrapper(props: Record<string, unknown>): ReactElement {
      return (
        <FullScreen>
          <StoryComponent {...props} />
        </FullScreen>
      )
    }
    return FullScreenWrapper
  }
}

/**
 * Wrap a story component in a `Box` with fixed dimensions.
 *
 * @param options - Layout options including width and padding.
 * @returns A decorator that wraps the story in a sized Box.
 */
export function withLayout(options: LayoutOptions): Decorator {
  return (
    StoryComponent: ComponentType<Record<string, unknown>>
  ): ComponentType<Record<string, unknown>> => {
    /**
     * @private
     */
    function LayoutWrapper(props: Record<string, unknown>): ReactElement {
      return (
        <Box width={options.width} padding={options.padding}>
          <StoryComponent {...props} />
        </Box>
      )
    }
    return LayoutWrapper
  }
}
