import { watch } from 'node:fs'
import { resolve } from 'node:path'

import { attempt, noop } from 'es-toolkit'

import type { StoryImporter } from './importer.js'
import type { StoryRegistry } from './registry.js'
import { SOURCE_FILE_EXTENSIONS, STORY_FILE_SUFFIXES } from './types.js'

/**
 * Options for creating a story watcher.
 */
export interface WatcherOptions {
  readonly directories: readonly string[]
  readonly importer: StoryImporter
  readonly registry: StoryRegistry
  readonly debounceMs?: number
  readonly onReloadStart?: () => void
  readonly onReloadEnd?: () => void
}

/**
 * A running story watcher that can be closed.
 */
export interface StoryWatcher {
  readonly close: () => void
}

/**
 * Create a file watcher that monitors story directories for changes.
 *
 * Uses `node:fs.watch` with recursive mode. Debounces rapid FS events
 * and re-imports changed story files via the importer.
 *
 * @param options - Watcher configuration.
 * @returns A Result tuple containing either an error or a frozen {@link StoryWatcher}.
 */
export function createStoryWatcher(
  options: WatcherOptions
): readonly [Error, null] | readonly [null, StoryWatcher] {
  const debounceMs = options.debounceMs ?? 150
  const timers: TimerMap = new Map()

  const [watchError, watchers] = tryCreateWatchers(options.directories, debounceMs, timers, options)
  if (watchError) {
    return [watchError, null]
  }

  return [
    null,
    Object.freeze({
      close: (): void => {
        watchers.map(closeWatcher)
        ;[...timers.values()].map(clearTimer)
        timers.clear()
      },
    }),
  ]
}

// ---------------------------------------------------------------------------

/**
 * Attempt to create fs watchers for all directories. If any `watch()` call
 * fails, close already-created watchers and clear timers, then return the error.
 *
 * @private
 * @param directories - Directories to watch.
 * @param debounceMs - Debounce interval in milliseconds.
 * @param timers - The shared timer map.
 * @param options - The watcher options containing importer and registry.
 * @returns A Result tuple with either an error or the array of watchers.
 */
function tryCreateWatchers(
  directories: readonly string[],
  debounceMs: number,
  timers: TimerMap,
  options: WatcherOptions
): readonly [Error, null] | readonly [null, ReturnType<typeof watch>[]] {
  const result = directories.reduce<
    readonly [Error, null] | readonly [null, ReturnType<typeof watch>[]]
  >(
    (acc, dir) => {
      if (acc[0]) {
        return acc
      }

      const [createError, watcher] = tryWatch(dir, debounceMs, timers, options)
      if (createError) {
        acc[1].map(closeWatcher)
        return [createError, null]
      }

      return [null, [...acc[1], watcher]]
    },
    [null, []]
  )

  if (result[0]) {
    ;[...timers.values()].map(clearTimer)
    timers.clear()
  }

  return result
}

/**
 * Try to create a single fs watcher for a directory.
 *
 * @private
 * @param dir - Directory to watch.
 * @param debounceMs - Debounce interval in milliseconds.
 * @param timers - The shared timer map.
 * @param options - The watcher options containing importer and registry.
 * @returns A Result tuple with either an error or the watcher.
 */
function tryWatch(
  dir: string,
  debounceMs: number,
  timers: TimerMap,
  options: WatcherOptions
): readonly [Error, null] | readonly [null, ReturnType<typeof watch>] {
  const [createError, watcher] = attempt<ReturnType<typeof watch>, Error>(() =>
    watch(dir, { recursive: true }, (_event, filename) => {
      if (filename === null || filename === undefined) {
        return
      }
      if (isStoryFile(filename)) {
        const absolutePath = resolve(dir, filename)
        debouncedAction(absolutePath, debounceMs, timers, () =>
          reloadStoryFile(absolutePath, options)
        )
        return
      }
      if (isSourceFile(filename)) {
        debouncedAction(RELOAD_ALL_KEY, debounceMs, timers, () => reloadAllStories(options))
      }
    })
  )
  if (createError) {
    return [createError, null]
  }
  watcher.on('error', noop)
  return [null, watcher]
}

/**
 * Timer map used to debounce file-system events.
 *
 * @private
 */
type TimerMap = Map<string | symbol, ReturnType<typeof setTimeout>>

/**
 * Close an fs watcher and return it.
 *
 * @private
 * @param watcher - The watcher to close.
 * @returns The closed watcher.
 */
function closeWatcher(watcher: ReturnType<typeof watch>): ReturnType<typeof watch> {
  watcher.close()
  return watcher
}

/**
 * Clear a timeout and return its id.
 *
 * @private
 * @param timer - The timer to clear.
 * @returns The cleared timer id.
 */
function clearTimer(timer: ReturnType<typeof setTimeout>): ReturnType<typeof setTimeout> {
  clearTimeout(timer)
  return timer
}

/**
 * Check if a filename matches the story file convention.
 *
 * @private
 * @param filename - The filename to check.
 * @returns `true` when the filename ends with a story extension.
 */
function isStoryFile(filename: string): boolean {
  return STORY_FILE_SUFFIXES.some((suffix) => filename.endsWith(suffix))
}

/**
 * Check if a filename is a source file that could affect story rendering
 * (e.g. a component file). Excludes files inside `node_modules`.
 *
 * @private
 * @param filename - The filename to check.
 * @returns `true` when the filename ends with a source extension.
 */
function isSourceFile(filename: string): boolean {
  if (filename.includes('node_modules')) {
    return false
  }
  return SOURCE_FILE_EXTENSIONS.some((ext) => filename.endsWith(ext))
}

/**
 * Stable key used by {@link debouncedAction} so rapid source-file edits
 * collapse into a single reload-all pass.
 *
 * @private
 */
const RELOAD_ALL_KEY: unique symbol = Symbol('reload_all')

/**
 * Schedule a debounced action keyed by a string. Rapid calls with the same
 * key collapse into a single invocation after `debounceMs`.
 *
 * @private
 * @param key - Unique key for the debounce timer.
 * @param debounceMs - Debounce interval in milliseconds.
 * @param timers - The shared timer map.
 * @param action - The async action to invoke after the debounce window.
 */
function debouncedAction(
  key: string | symbol,
  debounceMs: number,
  timers: TimerMap,
  action: () => Promise<void>
): void {
  const existing = timers.get(key)
  if (existing !== undefined) {
    clearTimeout(existing)
  }
  const timer = setTimeout(() => {
    timers.delete(key)
    action().catch(() => undefined)
  }, debounceMs)
  timers.set(key, timer)
}

/**
 * Invoke the optional reload lifecycle callbacks around an async action.
 *
 * @private
 * @param options - The watcher options containing lifecycle callbacks.
 * @param action - The async reload action to wrap.
 */
async function withReloadCallbacks(
  options: WatcherOptions,
  action: () => Promise<void>
): Promise<void> {
  if (options.onReloadStart !== undefined) {
    options.onReloadStart()
  }
  const callEnd = (): true => {
    if (options.onReloadEnd !== undefined) {
      options.onReloadEnd()
    }
    return true
  }
  await action().then(callEnd, callEnd)
}

/**
 * Import a single story entry and update the registry accordingly.
 *
 * @private
 * @param filePath - Absolute path to the story file.
 * @param options - The watcher options containing importer and registry.
 */
async function importAndUpdate(filePath: string, options: WatcherOptions): Promise<void> {
  const [importError, entry] = await options.importer.importStory(filePath)
  if (importError) {
    options.registry.remove(filePath)
  } else {
    options.registry.set(filePath, entry)
  }
}

/**
 * Re-import a story file and update the registry.
 *
 * @private
 * @param filePath - Absolute path to the story file.
 * @param options - The watcher options containing importer and registry.
 */
async function reloadStoryFile(filePath: string, options: WatcherOptions): Promise<void> {
  await withReloadCallbacks(options, () => importAndUpdate(filePath, options))
}

/**
 * Re-import all currently registered stories. Called when a non-story source
 * file changes, since any story could depend on the changed component.
 *
 * @private
 * @param options - The watcher options containing importer and registry.
 */
async function reloadAllStories(options: WatcherOptions): Promise<void> {
  await withReloadCallbacks(options, async () => {
    const storyKeys = [...options.registry.getAll().keys()]
    await Promise.all(storyKeys.map((filePath) => importAndUpdate(filePath, options)))
  })
}
