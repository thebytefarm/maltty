import { decorateContext } from '@/context/decorate.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type { IconsCtx } from './context.js'
import { createIconsContext } from './context.js'
import { createDefaultIcons } from './definitions.js'
import { detectNerdFonts } from './detect.js'
import { installNerdFont } from './install.js'
import type { IconsOptions } from './types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an icons middleware that decorates `ctx.icons`.
 *
 * Detects whether Nerd Fonts are installed. When `autoSetup` is enabled
 * and fonts are missing, prompts the user to install them. Merges any
 * custom icon definitions with the built-in defaults.
 *
 * @param options - Optional middleware configuration.
 * @returns A Middleware instance.
 *
 * @example
 * ```ts
 * import { icons } from 'maltty/icons'
 *
 * cli({
 *   middleware: [
 *     icons({ autoSetup: true, font: 'JetBrainsMono' }),
 *   ],
 * })
 * ```
 */
export function icons(options?: IconsOptions): Middleware {
  const resolved = resolveOptions(options)
  const frozenIcons = Object.freeze({ ...createDefaultIcons(), ...resolved.icons })

  return middleware(async (ctx, next) => {
    const isDetected = await detectNerdFonts()
    const iconsCtx = ctx as unknown as IconsCtx
    const isInstalled = await resolveInstallStatus({ ctx: iconsCtx, isDetected, resolved })

    const iconsContext = createIconsContext({
      ctx: iconsCtx,
      font: resolved.font,
      forceSetup: resolved.forceSetup,
      icons: frozenIcons,
      isInstalled,
    })

    decorateContext(ctx, 'icons', iconsContext)

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolved options with explicit undefined for missing fields.
 *
 * @private
 */
interface ResolvedOptions {
  readonly icons: IconsOptions['icons']
  readonly autoSetup: boolean
  readonly font: string | undefined
  readonly forceSetup: boolean
}

/**
 * Extract options into a resolved shape, avoiding optional chaining.
 *
 * @private
 * @param options - Raw middleware options.
 * @returns Resolved options with defaults applied.
 */
function resolveOptions(options: IconsOptions | undefined): ResolvedOptions {
  if (options === undefined) {
    return { autoSetup: false, font: undefined, forceSetup: false, icons: undefined }
  }

  return {
    autoSetup: options.autoSetup === true,
    font: options.font,
    forceSetup: options.forceSetup === true,
    icons: options.icons,
  }
}

/**
 * Parameters for {@link resolveInstallStatus}.
 *
 * @private
 */
interface ResolveInstallStatusParams {
  readonly isDetected: boolean
  readonly resolved: ResolvedOptions
  readonly ctx: IconsCtx
}

/**
 * Determine final install status, triggering auto-setup if configured.
 *
 * @private
 * @param params - Detection state, resolved options, and middleware context.
 * @returns Whether Nerd Fonts should be considered installed.
 */
async function resolveInstallStatus({
  isDetected,
  resolved,
  ctx,
}: ResolveInstallStatusParams): Promise<boolean> {
  if (isDetected) {
    return true
  }

  if (!resolved.autoSetup) {
    return false
  }

  const [error, result] = await installNerdFont({
    ctx,
    font: resolved.font,
  })

  if (error) {
    ctx.log.warn(`Auto-setup failed: ${error.message}`)
  }

  return result === true
}
