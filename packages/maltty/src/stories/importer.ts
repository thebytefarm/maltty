import Module from 'node:module'

import { toError } from '@maltty/utils/fp'
import { hasTag } from '@maltty/utils/tag'
import type { createJiti } from 'jiti'

import type { StoryEntry } from './types.js'

/**
 * A story importer that can load `.stories.{tsx,ts,jsx,js}` files.
 */
export interface StoryImporter {
  readonly importStory: (
    filePath: string
  ) => Promise<readonly [Error, null] | readonly [null, StoryEntry]>
}

/**
 * Create a story importer backed by jiti with cache disabled for hot reload.
 *
 * Installs a TypeScript extension resolution hook so that ESM-style `.js`
 * imports (e.g. `from './alert.js'`) resolve to `.ts` / `.tsx` source files.
 *
 * Returns an error Result when the `jiti` peer dependency is not installed.
 *
 * @returns A Result with a frozen {@link StoryImporter} or an {@link Error}.
 */
export function createStoryImporter(): readonly [Error, null] | readonly [null, StoryImporter] {
  const [jitiError, jitiCreateFn] = resolveJiti()

  if (jitiError) {
    return [jitiError, null]
  }

  try {
    installTsExtensionResolution()

    const jiti = jitiCreateFn(import.meta.url, {
      fsCache: false,
      moduleCache: false,
      interopDefault: true,
      jsx: { runtime: 'automatic' },
    })

    return [
      null,
      Object.freeze({
        importStory: async (
          filePath: string
        ): Promise<readonly [Error, null] | readonly [null, StoryEntry]> => {
          try {
            const mod = (await jiti.import(filePath)) as Record<string, unknown>
            const entry = (mod.default ?? mod) as unknown

            if (!isStoryEntry(entry)) {
              return [
                new Error(`File ${filePath} does not export a valid Story or StoryGroup`),
                null,
              ]
            }

            return [null, entry]
          } catch (error) {
            return [toError(error), null]
          }
        },
      }),
    ]
  } catch (error) {
    return [toError(error), null]
  }
}

// ---------------------------------------------------------------------------

/**
 * Attempt to resolve the `jiti` package at runtime.
 *
 * `jiti` is an optional peer dependency of `maltty`, but the stories
 * subsystem cannot function without it. Returns a Result tuple so callers can
 * surface a helpful message instead of crashing with a cryptic import error.
 *
 * @private
 * @returns A Result with the `createJiti` factory or an {@link Error}.
 */
function resolveJiti(): readonly [Error, null] | readonly [null, typeof createJiti] {
  try {
    const esmRequire = Module.createRequire(import.meta.url)
    const mod = esmRequire('jiti') as { readonly createJiti: typeof createJiti }
    return [null, mod.createJiti]
  } catch (error) {
    const isModuleNotFound =
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND' &&
      ((error as { requireStack?: readonly string[] }).requireStack ?? []).length === 0

    if (isModuleNotFound) {
      return [
        new Error(
          [
            'The "jiti" package is required to run stories but was not found.',
            '',
            'Install it with:',
            '  pnpm add jiti',
          ].join('\n')
        ),
        null,
      ]
    }

    return [toError(error), null]
  }
}

/**
 * TypeScript extensions to try when a `.js` import fails to resolve.
 *
 * @private
 */
const TS_EXTENSIONS: readonly string[] = ['.ts', '.tsx']

/**
 * TypeScript extensions to try when a `.jsx` import fails to resolve.
 *
 * @private
 */
const TSX_EXTENSIONS: readonly string[] = ['.tsx', '.ts', '.jsx']

/**
 * Name used to tag the patched `_resolveFilename` function so the
 * patch can detect itself and remain idempotent.
 *
 * @private
 */
const PATCHED_FN_NAME = '__maltty_ts_resolve'

/**
 * Patch `Module._resolveFilename` so that ESM-style `.js` / `.jsx` specifiers
 * fall back to their TypeScript equivalents (`.ts`, `.tsx`).
 *
 * This is the same strategy used by `tsx` and `ts-node`. The patch is
 * idempotent — calling it more than once is a no-op.
 *
 * @private
 */
function installTsExtensionResolution(): void {
  const mod = Module as unknown as Record<string, unknown>
  const current = mod._resolveFilename as (...args: unknown[]) => string

  if (current.name === PATCHED_FN_NAME) {
    return
  }

  const original = current

  const patched = {
    [PATCHED_FN_NAME]: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown
    ): string => {
      try {
        return original.call(mod, request, parent, isMain, options)
      } catch (error) {
        const alternates = resolveAlternateExtensions(request)

        const resolved = alternates.reduce<string | null>((found, alt) => {
          if (found) {
            return found
          }
          try {
            return original.call(mod, alt, parent, isMain, options)
          } catch {
            return null
          }
        }, null)

        if (resolved) {
          return resolved
        }
        throw error
      }
    },
  }

  mod._resolveFilename = patched[PATCHED_FN_NAME]
}

/**
 * Build a list of alternate file paths to try when a `.js` or `.jsx`
 * import fails to resolve.
 *
 * @private
 * @param request - The original module specifier.
 * @returns Alternate specifiers to try, or an empty array if not applicable.
 */
function resolveAlternateExtensions(request: string): readonly string[] {
  if (request.endsWith('.js')) {
    const base = request.slice(0, -3)
    return [...TS_EXTENSIONS.map((ext) => base + ext), base]
  }

  if (request.endsWith('.jsx')) {
    const base = request.slice(0, -4)
    return TSX_EXTENSIONS.map((ext) => base + ext)
  }

  return []
}

/**
 * Check whether a value is a valid {@link StoryEntry} (tagged as `Story` or `StoryGroup`).
 *
 * @private
 * @param value - The value to check.
 * @returns `true` when `value` carries a `Story` or `StoryGroup` tag.
 */
function isStoryEntry(value: unknown): value is StoryEntry {
  return hasTag(value, 'Story') || hasTag(value, 'StoryGroup')
}
