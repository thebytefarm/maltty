import { ok } from '@kidd-cli/utils/fp'
import type { ResultAsync } from '@kidd-cli/utils/fp'

import type { CommandContext } from '@/context/types.js'

import { getIconsByCategory } from './definitions.js'
import { installNerdFont } from './install.js'
import type { IconCategory, IconDefinition, IconsContext, IconsError } from './types.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Minimal context subset needed by the icons context factory.
 */
export type IconsCtx = Pick<CommandContext, 'log' | 'prompts' | 'status'>

/**
 * Options for {@link createIconsContext}.
 */
export interface CreateIconsContextOptions {
  readonly ctx: IconsCtx
  readonly icons: Readonly<Record<string, IconDefinition>>
  readonly isInstalled: boolean
  readonly font?: string
  readonly forceSetup?: boolean
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an {@link IconsContext} value for `ctx.icons`.
 *
 * The returned object exposes methods for resolving icons (`get`, `has`,
 * `installed`, `setup`, `category`).
 *
 * @param options - Factory options.
 * @returns An IconsContext instance.
 */
export function createIconsContext(options: CreateIconsContextOptions): IconsContext {
  const { ctx, icons, font, forceSetup } = options
  // NOTE: Intentional mutable closure — mutating `state.isInstalled` after
  // A successful setup() is required so that existing references to ctx.icons
  // Reflect the updated install status without replacing the object.
  const state = { isInstalled: options.isInstalled }

  return Object.freeze({
    category: (cat: IconCategory): Readonly<Record<string, string>> => {
      const categoryIcons = getIconsByCategory(cat)
      return Object.freeze(
        Object.fromEntries(
          Object.entries(categoryIcons).map(([name, def]) => [
            name,
            resolveIcon(icons, name, state.isInstalled, def),
          ])
        )
      )
    },
    get: (name: string): string => resolveIcon(icons, name, state.isInstalled),
    has: (name: string): boolean => Object.hasOwn(icons, name),
    installed: (): boolean => isInstalled({ forceSetup, state }),
    setup: async (): ResultAsync<boolean, IconsError> => {
      const [error, result] = await installNerdFont({ ctx, font })

      if (error) {
        return [error, null] as const
      }

      if (result) {
        state.isInstalled = true
      }

      return ok(result)
    },
  }) satisfies IconsContext
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a single icon to its appropriate glyph string.
 *
 * @private
 * @param icons - The full icon definitions record.
 * @param name - The icon name to resolve.
 * @param nerdFontsInstalled - Whether Nerd Fonts are available.
 * @param fallbackDef - Optional fallback definition (used for category resolution).
 * @returns The resolved glyph string, or empty string if not found.
 */
function resolveIcon(
  icons: Readonly<Record<string, IconDefinition>>,
  name: string,
  nerdFontsInstalled: boolean,
  fallbackDef?: IconDefinition
): string {
  const def = icons[name] ?? fallbackDef
  if (def === undefined) {
    return ''
  }

  if (nerdFontsInstalled) {
    return def.nerdFont
  }
  return def.emoji
}

/**
 * Whether icons are currently installed.
 *
 * `forceSetup` overrides the runtime state — when true the context reports
 * "not installed" so the consumer is forced to run setup.
 *
 * @private
 * @param params - The forceSetup flag and the mutable installation state.
 * @returns `true` when nerd fonts are usable.
 */
function isInstalled(params: {
  readonly forceSetup: boolean | undefined
  readonly state: { readonly isInstalled: boolean }
}): boolean {
  if (params.forceSetup) {
    return false
  }
  return params.state.isInstalled
}
