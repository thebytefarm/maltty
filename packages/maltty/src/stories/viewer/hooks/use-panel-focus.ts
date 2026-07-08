import { useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The current interaction mode in the stories viewer.
 *
 * - `browse` — Sidebar is active, user navigates the story tree.
 * - `preview` — Preview panel is focused, story and props are visible but read-only.
 * - `edit` — Props editor is active, user edits field values.
 * - `interactive` — Story component has full terminal control, props are hidden.
 */
export type ViewerMode = 'browse' | 'preview' | 'edit' | 'interactive'

/**
 * State and controls for managing the viewer interaction mode.
 */
export interface ViewerModeState {
  readonly mode: ViewerMode
  readonly enterPreviewMode: () => void
  readonly exitPreviewMode: () => void
  readonly enterEditMode: () => void
  readonly exitEditMode: () => void
  readonly enterInteractiveMode: () => void
  readonly exitInteractiveMode: () => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Manage the interaction mode between browsing, previewing, editing, and
 * interactive control. The viewer starts in browse mode. Selecting a story
 * enters preview mode. From preview, the user can enter edit or interactive
 * mode. Exiting returns one level up.
 *
 * @returns The current viewer mode state and control functions.
 */
export function useViewerMode(): ViewerModeState {
  const [mode, setMode] = useState<ViewerMode>('browse')

  const enterPreviewMode = useCallback(() => {
    setMode('preview')
  }, [])

  const exitPreviewMode = useCallback(() => {
    setMode('browse')
  }, [])

  const enterEditMode = useCallback(() => {
    setMode('edit')
  }, [])

  const exitEditMode = useCallback(() => {
    setMode('preview')
  }, [])

  const enterInteractiveMode = useCallback(() => {
    setMode('interactive')
  }, [])

  const exitInteractiveMode = useCallback(() => {
    setMode('preview')
  }, [])

  return {
    mode,
    enterPreviewMode,
    exitPreviewMode,
    enterEditMode,
    exitEditMode,
    enterInteractiveMode,
    exitInteractiveMode,
  }
}
