import process from 'node:process'

import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { P, match } from 'ts-pattern'

import type { DiscoverError } from '../discover.js'
import { discoverStories } from '../discover.js'
import { createStoryImporter } from '../importer.js'
import { createStoryRegistry } from '../registry.js'
import type { StoryEntry } from '../types.js'
import { createStoryWatcher } from '../watcher.js'
import { useReloadState } from './hooks/use-reload-state.js'
import { StoriesApp } from './stories-app.js'
import { StoriesCheck } from './stories-check.js'
import { StoriesOutput } from './stories-output.js'
import { buildIncludePatterns } from './utils.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StoriesScreen} component.
 */
interface StoriesScreenProps {
  readonly include?: string
  readonly out?: string
  readonly check?: boolean
}

/**
 * Discovery phase state.
 *
 * @private
 */
type DiscoveryState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'error'; readonly message: string }
  | { readonly phase: 'empty'; readonly errors: readonly DiscoverError[] }
  | { readonly phase: 'ready' }

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Screen-compatible wrapper that discovers stories on mount, sets up
 * the file watcher, and renders the {@link StoriesApp} when ready.
 *
 * Designed to be used with `screen()` so the framework manages
 * stdin/raw mode and the Ink rendering lifecycle.
 *
 * When `--out` is provided, renders the matching story (or all stories)
 * to stdout and exits immediately — useful for piping to LLMs.
 *
 * @param props - The stories screen props.
 * @returns A rendered stories screen element.
 */
export function StoriesScreen({ include, out, check }: StoriesScreenProps): ReactElement {
  if (check === true) {
    return <StoriesCheck include={include} />
  }

  return match(out)
    .with(P.string, (storyFilter) => <StoriesOutput filter={storyFilter} include={include} />)
    .with(P.nullish, () => <StoriesViewer include={include} />)
    .exhaustive()
}

/**
 * Interactive TUI viewer that discovers stories on mount, sets up
 * the file watcher, and renders the {@link StoriesApp} when ready.
 *
 * @private
 * @param props - The viewer props.
 * @returns A rendered stories viewer element.
 */
function StoriesViewer({ include }: { readonly include?: string }): ReactElement {
  const [state, setState] = useState<DiscoveryState>({ phase: 'loading' })
  // eslint-disable-next-line react/hook-use-state -- read-only state, setter intentionally unused
  const [registry] = useState(createStoryRegistry)
  const { isReloading, onReloadStart, onReloadEnd } = useReloadState()

  useEffect(() => {
    const [importerError, importer] = createStoryImporter()

    if (importerError) {
      setState({ phase: 'error', message: importerError.message })
      return () => {}
    }

    const cwd = process.cwd()
    const includePatterns = buildIncludePatterns(include)

    const run = async (): Promise<void> => {
      const result = await discoverStories({
        cwd,
        importer,
        include: includePatterns,
      })

      const entries = [...result.entries] as readonly (readonly [string, StoryEntry])[]
      entries.map(([name, entry]) => registry.set(name, entry))

      if (entries.length === 0) {
        setState({ phase: 'empty', errors: result.errors })
        return
      }

      setState({ phase: 'ready' })
    }

    run().catch(() => {
      setState({ phase: 'empty', errors: [] })
    })

    const [watchError, watcher] = createStoryWatcher({
      directories: [cwd],
      importer,
      registry,
      onReloadStart,
      onReloadEnd,
    })

    if (watchError) {
      return () => {}
    }

    return () => {
      watcher.close()
    }
  }, [include, registry, onReloadStart, onReloadEnd])

  return match(state)
    .with({ phase: 'loading' }, () => <Text>Discovering stories...</Text>)
    .with({ phase: 'error' }, ({ message }) => <Text color="red">{message}</Text>)
    .with({ phase: 'empty' }, ({ errors }) => (
      <Box flexDirection="column">
        <Text>
          No stories found. Create a .stories.tsx file in your src/ directory to get started.
        </Text>
        {errors.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">{errors.length} file(s) failed to import:</Text>
            {errors.map((e) => (
              <Text key={e.filePath} dimColor>
                {'  '}
                {e.filePath}: {e.message}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    ))
    .with({ phase: 'ready' }, () => <StoriesApp registry={registry} isReloading={isReloading} />)
    .exhaustive()
}
