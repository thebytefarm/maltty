import type { ResultAsync } from '@maltty/utils/fp'

import type { Middleware } from '@/types/index.js'

// ---------------------------------------------------------------------------
// Icon definition
// ---------------------------------------------------------------------------

/**
 * A single icon definition with both Nerd Font glyph and emoji fallback.
 */
export interface IconDefinition {
  readonly nerdFont: string
  readonly emoji: string
}

// ---------------------------------------------------------------------------
// Icon category
// ---------------------------------------------------------------------------

/**
 * Supported icon categories for grouping icons by domain.
 */
export type IconCategory = 'git' | 'devops' | 'status' | 'files'

// ---------------------------------------------------------------------------
// Icons error
// ---------------------------------------------------------------------------

/**
 * Error returned by icons middleware operations.
 */
export interface IconsError {
  readonly type: 'detection_failed' | 'install_failed'
  readonly message: string
}

// ---------------------------------------------------------------------------
// Icons options
// ---------------------------------------------------------------------------

/**
 * Options accepted by the `icons()` middleware factory.
 *
 * @property icons - Custom icon definitions to merge with defaults.
 * @property autoSetup - When true, prompts to install Nerd Fonts if not detected.
 * @property font - The Nerd Font family to install (defaults to JetBrainsMono).
 * @property forceSetup - When true, always show the install prompt even if fonts are detected.
 */
export interface IconsOptions {
  readonly icons?: Readonly<Record<string, IconDefinition>>
  readonly autoSetup?: boolean
  readonly font?: string
  readonly forceSetup?: boolean
}

// ---------------------------------------------------------------------------
// Icons context
// ---------------------------------------------------------------------------

/**
 * Icons context decorated onto `ctx.icons` by the icons middleware.
 *
 * Provides methods to resolve icon names to glyphs, check installation
 * status, and interactively install Nerd Fonts.
 */
export interface IconsContext {
  /**
   * Resolve an icon name to its glyph string.
   *
   * @param name - The icon name to resolve.
   * @returns The resolved glyph string, or empty string if not found.
   */
  readonly get: (name: string) => string

  /**
   * Check whether an icon name is defined.
   *
   * @param name - The icon name to check.
   * @returns True when the icon name exists in definitions.
   */
  readonly has: (name: string) => boolean

  /**
   * Check whether Nerd Fonts are detected on the system.
   *
   * @returns True when Nerd Fonts are installed.
   */
  readonly installed: () => boolean

  /**
   * Interactively prompt to install Nerd Fonts.
   *
   * @returns A Result with true on success or an IconsError on failure.
   */
  readonly setup: () => ResultAsync<boolean, IconsError>

  /**
   * Get all resolved icons for a given category.
   *
   * @param cat - The icon category to retrieve.
   * @returns A record mapping icon names to resolved glyph strings.
   */
  readonly category: (cat: IconCategory) => Readonly<Record<string, string>>
}

// ---------------------------------------------------------------------------
// Icons factory
// ---------------------------------------------------------------------------

/**
 * Factory function type for the icons middleware.
 */
export type IconsFactory = (options?: IconsOptions) => Middleware

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------

/**
 * Augments the base {@link CommandContext} with an optional `icons` property.
 *
 * When a consumer imports `@maltty/core/icons`, this declaration merges
 * `icons` onto `CommandContext` so that `ctx.icons` is typed without manual casting.
 */
declare module '@maltty/core' {
  interface CommandContext {
    readonly icons: IconsContext
  }
}
