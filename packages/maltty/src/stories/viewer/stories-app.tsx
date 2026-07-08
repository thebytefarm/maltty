/* oxlint-disable import/max-dependencies -- Root TUI layout requires many component imports */
import { relative } from 'node:path'
import process from 'node:process'

import { hasTag } from '@maltty/utils/tag'
import { Box, Text, useApp, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { match } from 'ts-pattern'

import { FullScreen } from '../../ui/layout/fullscreen.js'
import { useHotkey } from '../../ui/use-key-binding.js'
import type { StoryRegistry } from '../registry.js'
import { schemaToFieldDescriptors } from '../schema.js'
import type { Story, StoryEntry, StoryGroup } from '../types.js'
import { validateProps } from '../validate.js'
import { Header } from './components/header.js'
import { HelpOverlay } from './components/help-overlay.js'
import { Preview } from './components/preview.js'
import type { PreviewContext } from './components/preview.js'
import { Sidebar } from './components/sidebar.js'
import { StatusBar } from './components/status-bar.js'
import { useViewerMode } from './hooks/use-panel-focus.js'
import { useStories } from './hooks/use-stories.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StoriesApp} component.
 */
interface StoriesAppProps {
  readonly registry: StoryRegistry
  readonly isReloading: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Root layout component for the stories viewer TUI. Combines the sidebar,
 * preview, props editor, and status bar into a fullscreen interactive
 * terminal application.
 *
 * Operates in four modes:
 * - **browse** — Sidebar is active, user navigates the story tree.
 * - **preview** — Preview panel focused, story and props visible but read-only.
 * - **edit** — Props editor is active, user edits field values.
 * - **interactive** — Story has full terminal control, props are hidden.
 *
 * @param props - The stories app props.
 * @returns A rendered stories app element.
 */
export function StoriesApp({ registry, isReloading }: StoriesAppProps): ReactElement {
  const entries = useStories(registry)
  const {
    mode,
    enterPreviewMode,
    exitPreviewMode,
    enterEditMode,
    exitEditMode,
    enterInteractiveMode,
    exitInteractiveMode,
  } = useViewerMode()
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [currentProps, setCurrentProps] = useState<Record<string, unknown>>({})
  const [showHelp, setShowHelp] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const { exit } = useApp()

  const selectedStory = useMemo(
    () => resolveStory(entries, selectedStoryId),
    [entries, selectedStoryId]
  )

  useEffect(() => {
    if (entries.size === 0 || selectedStoryId !== null) {
      return
    }
    const firstId = findFirstLeafId(entries)
    if (firstId === null) {
      return
    }
    const resolved = resolveStory(entries, firstId)
    setSelectedStoryId(firstId)
    if (resolved !== null) {
      setCurrentProps({ ...resolved.props })
    }
  }, [entries, selectedStoryId])

  const previewContext = useMemo(
    () => buildPreviewContext(entries, selectedStoryId, selectedStory),
    [entries, selectedStoryId, selectedStory]
  )

  const fields = useMemo(() => {
    if (selectedStory === null) {
      return [] as const
    }
    const allFields = schemaToFieldDescriptors(selectedStory.schema)
    const hiddenKeys = new Set(selectedStory.defaultKeys)
    return allFields.filter((field) => !hiddenKeys.has(field.name))
  }, [selectedStory])

  const errors = useMemo(() => {
    if (selectedStory === null) {
      return [] as const
    }
    return validateProps({ schema: selectedStory.schema, props: currentProps })
  }, [selectedStory, currentProps])

  const handleSelect = useCallback(
    (id: string) => {
      const resolved = resolveStory(entries, id)
      setSelectedStoryId(id)
      if (resolved !== null) {
        setCurrentProps({ ...resolved.props })
      }
      enterPreviewMode()
    },
    [entries, enterPreviewMode]
  )

  const handlePropsChange = useCallback((name: string, value: unknown) => {
    setCurrentProps((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleResetProps = useCallback(() => {
    if (selectedStory !== null) {
      setCurrentProps({ ...selectedStory.props })
    }
  }, [selectedStory])

  const handleCloseHelp = useCallback(() => {
    setShowHelp(false)
  }, [])

  useHotkey({
    keys: ['escape escape'],
    action: exitInteractiveMode,
    active: mode === 'interactive',
  })

  useInput(
    (_input, key) => {
      if (key.escape) {
        exitEditMode()
      }
    },
    { isActive: mode === 'edit' }
  )

  useInput(
    (input, key) => {
      if (showHelp) {
        return
      }
      if (key.return && selectedStory !== null) {
        enterEditMode()
        return
      }
      if (key.escape) {
        exitPreviewMode()
      }
      if (input === 'i' && selectedStory !== null) {
        enterInteractiveMode()
      }
      if (input === 'r') {
        handleResetProps()
      }
      if (input === 'q') {
        exit()
      }
      if (input === '?') {
        setShowHelp(true)
      }
      if (input === 'b') {
        setShowSidebar((prev) => !prev)
      }
    },
    { isActive: mode === 'preview' }
  )

  useInput(
    (input, _key) => {
      if (showHelp) {
        return
      }
      if (input === 'q') {
        exit()
      }
      if (input === 'r') {
        handleResetProps()
      }
      if (input === '?') {
        setShowHelp(true)
      }
      if (input === 'b') {
        setShowSidebar((prev) => !prev)
      }
    },
    { isActive: mode === 'browse' }
  )

  if (showHelp) {
    return (
      <FullScreen>
        <HelpOverlay onClose={handleCloseHelp} />
      </FullScreen>
    )
  }

  const isInteractive = mode === 'interactive'

  return (
    <FullScreen>
      <Box flexDirection="column" flexGrow={1}>
        {match(isInteractive)
          .with(false, () => <Header />)
          .with(true, () => null)
          .exhaustive()}
        <Box flexDirection="row" flexGrow={1} overflow="hidden">
          {match(isInteractive)
            .with(false, () => (
              <Sidebar
                entries={entries}
                selectedId={selectedStoryId}
                onSelect={handleSelect}
                isFocused={mode === 'browse' && showSidebar}
                hidden={!showSidebar}
              />
            ))
            .with(true, () => null)
            .exhaustive()}
          <Box flexDirection="column" flexGrow={1}>
            {match(isReloading)
              .with(true, () => <ReloadOverlay />)
              .with(false, () => (
                <Preview
                  story={selectedStory}
                  currentProps={currentProps}
                  context={previewContext}
                  fields={fields}
                  errors={errors}
                  onPropsChange={handlePropsChange}
                  isFocused={mode === 'preview' || mode === 'edit'}
                  editable={mode === 'edit'}
                  borderless={isInteractive || !showSidebar}
                  interactive={isInteractive}
                />
              ))
              .exhaustive()}
          </Box>
        </Box>
        <StatusBar mode={mode} hasSelection={selectedStoryId !== null} isReloading={isReloading} />
      </Box>
    </FullScreen>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * A parsed story ID — either a direct story key or a group variant reference.
 *
 * @private
 */
type ParsedStoryId =
  | { readonly type: 'single'; readonly key: string }
  | { readonly type: 'group'; readonly groupKey: string; readonly variantName: string }

/**
 * Parse a story ID into its constituent parts.
 *
 * Direct story IDs contain no separator. Group variant IDs use the
 * `groupKey::variantName` format.
 *
 * @private
 * @param id - The raw story ID string.
 * @returns The parsed story ID.
 */
function parseStoryId(id: string): ParsedStoryId {
  const separatorIndex = id.indexOf('::')
  if (separatorIndex === -1) {
    return { type: 'single', key: id }
  }
  return {
    type: 'group',
    groupKey: id.slice(0, separatorIndex),
    variantName: id.slice(separatorIndex + 2),
  }
}

/**
 * Resolve a story from the entries map by its ID. Supports both direct
 * story keys and group variant keys in the format `groupKey::variantName`.
 *
 * @private
 * @param entries - The story registry entries.
 * @param id - The story ID to resolve.
 * @returns The resolved story, or null if not found.
 */
function resolveStory(entries: ReadonlyMap<string, StoryEntry>, id: string | null): Story | null {
  if (id === null) {
    return null
  }

  const parsed = parseStoryId(id)

  return match(parsed)
    .with({ type: 'single' }, ({ key }) => {
      const entry = entries.get(key)
      if (entry === undefined || !hasTag(entry, 'Story')) {
        return null
      }
      return entry as Story
    })
    .with({ type: 'group' }, ({ groupKey, variantName }) => {
      const group = entries.get(groupKey)
      if (group === undefined || !hasTag(group, 'StoryGroup')) {
        return null
      }
      return group.stories[variantName] ?? null
    })
    .exhaustive()
}

/**
 * Build the preview context from the selected story ID and resolved story.
 * Computes the relative file path and a qualified display name
 * (e.g. "LogLevel > Info" for group variants, "StatusBadge" for singles).
 *
 * @private
 * @param entries - The story registry entries.
 * @param id - The selected story ID.
 * @param story - The resolved story, or null.
 * @returns A preview context, or null when no story is selected.
 */
function buildPreviewContext(
  entries: ReadonlyMap<string, StoryEntry>,
  id: string | null,
  story: Story | null
): PreviewContext | null {
  if (id === null || story === null) {
    return null
  }

  const parsed = parseStoryId(id)
  const cwd = process.cwd()

  return match(parsed)
    .with({ type: 'single' }, ({ key }) => ({
      filePath: relative(cwd, key),
      displayName: story.name,
      description: story.description,
    }))
    .with({ type: 'group' }, ({ groupKey, variantName }) => {
      const group = entries.get(groupKey)
      const groupTitle = resolveGroupTitle(group)
      return {
        filePath: relative(cwd, groupKey),
        displayName: `${groupTitle} > ${variantName}`,
        description: story.description,
      }
    })
    .exhaustive()
}

/**
 * Extract the title from a story group entry, falling back to 'Unknown'.
 *
 * @private
 * @param entry - The story entry to inspect.
 * @returns The group title.
 */
function resolveGroupTitle(entry: StoryEntry | undefined): string {
  if (entry === undefined) {
    return 'Unknown'
  }
  if (hasTag(entry, 'StoryGroup')) {
    return (entry as StoryGroup).title
  }
  return 'Unknown'
}

/**
 * Find the first selectable story ID from the entries map. For single
 * stories this is the entry key. For groups, it is the first variant
 * key in `groupKey::variantName` format.
 *
 * @private
 * @param entries - The story registry entries.
 * @returns The first leaf story ID, or null if the map is empty.
 */
function findFirstLeafId(entries: ReadonlyMap<string, StoryEntry>): string | null {
  const first = entries.entries().next()
  if (first.done) {
    return null
  }
  const [key, entry] = first.value
  if (hasTag(entry, 'Story')) {
    return key
  }
  if (hasTag(entry, 'StoryGroup')) {
    const variantNames = Object.keys((entry as StoryGroup).stories)
    if (variantNames.length === 0) {
      return null
    }
    return `${key}::${variantNames[0]}`
  }
  return null
}

/**
 * Full-panel overlay shown while stories are being reloaded from disk.
 *
 * @private
 * @returns A rendered reload overlay element.
 */
function ReloadOverlay(): ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center">
      <Text bold color="yellow">
        Reloading stories...
      </Text>
    </Box>
  )
}
