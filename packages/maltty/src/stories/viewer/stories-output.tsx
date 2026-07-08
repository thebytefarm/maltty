import process from 'node:process'

import { hasTag } from '@maltty/utils/tag'
import { Box, Text, useApp } from 'ink'
import type { ComponentType, ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { match } from 'ts-pattern'

import { discoverStories } from '../discover.js'
import { createStoryImporter } from '../importer.js'
import type { Decorator, Story, StoryEntry, StoryGroup } from '../types.js'
import { applyDecorators, buildIncludePatterns } from './utils.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StoriesOutput} component.
 */
interface StoriesOutputProps {
  readonly filter: string
  readonly include?: string
}

/**
 * Output phase state.
 *
 * @private
 */
type OutputState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'error'; readonly message: string }
  | { readonly phase: 'ready'; readonly stories: readonly ResolvedStory[] }

/**
 * A resolved story ready for rendering.
 *
 * @private
 */
interface ResolvedStory {
  readonly name: string
  readonly component: ComponentType<Record<string, unknown>>
  readonly props: Record<string, unknown>
  readonly decorators: readonly Decorator[]
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Non-interactive component that discovers stories, renders the matching
 * story (or all stories) to stdout with divider headers, and exits.
 *
 * When `filter` is empty, all stories are rendered. When `filter` is a
 * story name, only that story is rendered.
 *
 * @param props - The stories output props.
 * @returns A rendered stories output element.
 */
export function StoriesOutput({ filter, include }: StoriesOutputProps): ReactElement {
  const [state, setState] = useState<OutputState>({ phase: 'loading' })
  const { exit } = useApp()

  useEffect(() => {
    const [importerError, importer] = createStoryImporter()

    if (importerError) {
      setState({ phase: 'error', message: importerError.message })
      return
    }

    const cwd = process.cwd()
    const includePatterns = buildIncludePatterns(include)

    const run = async (): Promise<void> => {
      const result = await discoverStories({
        cwd,
        importer,
        include: includePatterns,
      })

      const allStories = collectAllStories(result.entries)

      if (allStories.length === 0) {
        setState({ phase: 'error', message: 'No stories found.' })
        return
      }

      const filtered = match(filter)
        .with('', () => allStories)
        .otherwise((name) => filterByName(allStories, name))

      if (filtered.length === 0) {
        const available = allStories.map((s) => s.name)
        setState({
          phase: 'error',
          message: `Story "${filter}" not found.\nAvailable: ${available.join(', ')}`,
        })
        return
      }

      setState({ phase: 'ready', stories: filtered })
    }

    run().catch((error: unknown) => {
      const message = match(error instanceof Error)
        .with(true, () => (error as Error).message)
        .with(false, () => 'Unknown error during discovery')
        .exhaustive()
      setState({ phase: 'error', message })
    })
  }, [filter, include])

  const shouldExit = state.phase === 'error'
  useEffect(() => {
    if (shouldExit) {
      process.exitCode = 1
      exit()
    }
  }, [shouldExit, exit])

  return match(state)
    .with({ phase: 'loading' }, () => <Text dimColor>Discovering stories...</Text>)
    .with({ phase: 'error' }, ({ message }) => <Text color="red">{message}</Text>)
    .with({ phase: 'ready' }, ({ stories }) => <StoryRenderer stories={stories} onDone={exit} />)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render all resolved stories with divider headers, then exit.
 *
 * @private
 */
function StoryRenderer({
  stories,
  onDone,
}: {
  readonly stories: readonly ResolvedStory[]
  readonly onDone: () => void
}): ReactElement {
  const rendered = useMemo(
    () =>
      stories.map((s) => {
        const Decorated = applyDecorators(s.component, s.decorators)
        return { name: s.name, Component: Decorated, props: s.props }
      }),
    [stories]
  )

  useEffect(() => {
    const timer = setTimeout(onDone, 0)
    return () => {
      clearTimeout(timer)
    }
  }, [onDone])

  return (
    <Box flexDirection="column">
      {rendered.map((entry) => (
        <Box key={entry.name} flexDirection="column">
          <StoryDivider name={entry.name} />
          <entry.Component {...entry.props} />
        </Box>
      ))}
    </Box>
  )
}

/**
 * Render a divider line with the story name.
 *
 * @private
 */
function StoryDivider({ name }: { readonly name: string }): ReactElement {
  const label = ` ${name} `
  const padding = '─'.repeat(Math.max(0, 40 - label.length))

  return (
    <Box marginBottom={1}>
      <Text dimColor>
        ────{label}
        {padding}
      </Text>
    </Box>
  )
}

/**
 * Collect all stories from entries, flattening groups into individual stories.
 *
 * @private
 * @param entries - The discovered story entries.
 * @returns A flat array of resolved stories.
 */
function collectAllStories(entries: ReadonlyMap<string, StoryEntry>): readonly ResolvedStory[] {
  return [...entries.values()].flatMap((entry) => {
    if (hasTag(entry, 'Story')) {
      const s = entry as Story
      return [
        {
          name: s.name,
          component: s.component as ComponentType<Record<string, unknown>>,
          props: s.props as Record<string, unknown>,
          decorators: s.decorators,
        },
      ]
    }

    if (hasTag(entry, 'StoryGroup')) {
      const group = entry as StoryGroup
      return Object.entries(group.stories).map(([variantName, variant]) => ({
        name: `${group.title} / ${variantName}`,
        component: variant.component as ComponentType<Record<string, unknown>>,
        props: variant.props as Record<string, unknown>,
        decorators: [...group.decorators, ...variant.decorators],
      }))
    }

    return []
  })
}

/**
 * Filter stories by name. Supports `Group/Variant` format for exact
 * variant selection, or a plain name for partial matching against
 * all story names.
 *
 * @private
 * @param stories - All resolved stories.
 * @param name - The filter string (e.g. "SystemMonitor/Critical" or "StatusBadge").
 * @returns Matching stories.
 */
function filterByName(stories: readonly ResolvedStory[], name: string): readonly ResolvedStory[] {
  const normalized = name.toLowerCase()

  if (normalized.includes('/')) {
    const compact = normalized.replaceAll(' ', '')
    return stories.filter((s) => s.name.toLowerCase().replaceAll(' ', '') === compact)
  }

  return stories.filter((s) => s.name.toLowerCase().includes(normalized))
}
