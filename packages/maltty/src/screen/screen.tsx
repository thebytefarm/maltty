import process from 'node:process'

import { isFunction } from '@maltty/utils/fp'
import { withTag } from '@maltty/utils/tag'
import type { ComponentType } from 'react'
import React from 'react'
import { match } from 'ts-pattern'

import type { CommandContext, ImperativeContextKeys, ScreenContext } from '../context/types.js'
import type { ArgsDef, Command, InferArgsMerged, Resolvable } from '../types/index.js'
import { FullScreen, LEAVE_ALT_SCREEN } from '../ui/layout/fullscreen.js'
import { createScreenLog } from './output/screen-log.js'
import { createScreenReport } from './output/screen-report.js'
import { createScreenSpinner } from './output/screen-spinner.js'
import { injectOutputStore } from './output/store-key.js'
import { createOutputStore } from './output/store.js'
import { MalttyProvider } from './provider.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Exit behavior for a screen.
 *
 * - `'manual'` (default) — the screen stays alive until the component calls
 *   `useApp().exit()` or the user presses Ctrl-C.
 * - `'auto'` — the runtime calls `exit()` automatically once the component
 *   unmounts or the render tree settles.
 */
export type ScreenExit = 'auto' | 'manual'

/**
 * Definition passed to `screen()`.
 *
 * @typeParam TOptionsDef - Option (flag) definitions type.
 * @typeParam TPositionalsDef - Positional argument definitions type.
 */
export interface ScreenDef<
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
> {
  /**
   * Explicit command name. Overrides the filename-derived name from autoload.
   */
  readonly name?: string

  /**
   * Alternative names for this screen command.
   */
  readonly aliases?: readonly string[]

  /**
   * Human-readable description shown in help text.
   */
  readonly description?: Resolvable<string>

  /**
   * When `true`, the screen command is hidden from help output.
   */
  readonly hidden?: Resolvable<boolean>

  /**
   * Marks the screen command as deprecated.
   */
  readonly deprecated?: Resolvable<string | boolean>

  /**
   * Option (flag) definitions — zod object schema (recommended) or yargs-native format.
   */
  readonly options?: TOptionsDef

  /**
   * Positional argument definitions — zod object schema (recommended) or yargs-native format.
   */
  readonly positionals?: TPositionalsDef

  /**
   * Exit behavior. Defaults to `'manual'`.
   */
  readonly exit?: ScreenExit

  /**
   * When `true`, the screen renders in the terminal's alternate screen
   * buffer (fullscreen mode). Preserves the user's scrollback history
   * and restores it on exit.
   *
   * Accepts a static boolean or a resolver function that receives the
   * {@link ScreenContext} and returns a boolean (sync or async). The
   * resolver runs after middleware, so `ctx.args` and `ctx.config` are
   * available for conditional fullscreen decisions.
   */
  readonly fullscreen?: boolean | ((ctx: ScreenContext) => boolean | Promise<boolean>)

  /**
   * When `true` (inherited default), yargs rejects unknown flags for this screen.
   * Set to `false` to allow unknown flags to pass through unchecked,
   * overriding the CLI-level `strict` setting.
   */
  readonly strict?: boolean

  /**
   * A React component that receives the parsed args as props.
   *
   * Can be a component reference (`render: MyComponent`) or an inline
   * function (`render: (args) => <MyComponent {...args} />`).
   */
  readonly render: ComponentType<InferArgsMerged<TOptionsDef, TPositionalsDef>>
}

/**
 * Define a screen command that renders a React/Ink TUI.
 *
 * The `render` property accepts a React component that receives the
 * parsed args as props. The full command context — including `log`,
 * `status`, and any middleware-decorated properties like `report` —
 * is available via `useScreenContext()`.
 *
 * Imperative I/O properties (`log`, `status`, `report`) are automatically
 * swapped with React-backed implementations that render through the
 * `<Output />` component, so the same interface works in both
 * `command()` and `screen()` contexts.
 *
 * @param def - Screen definition including description, options, exit behavior, and render component.
 * @returns A tagged Command object compatible with the maltty autoloader and command map.
 */
export function screen<
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
>(def: ScreenDef<TOptionsDef, TPositionalsDef>): Command {
  const exitMode = def.exit ?? 'manual'
  const ScreenComponent = def.render as ComponentType<Record<string, unknown>>

  const renderFn = async (ctx: CommandContext): Promise<void> => {
    const { render: inkRender } = await import('ink')
    const screenCtx = toScreenContext(ctx)
    const isFullscreen = await match(isFunction(def.fullscreen))
      .with(true, () =>
        (def.fullscreen as (ctx: ScreenContext) => boolean | Promise<boolean>)(screenCtx)
      )
      .with(false, () => def.fullscreen === true)
      .exhaustive()

    const children = match(isFullscreen)
      .with(true, () => (
        <FullScreen>
          <ScreenComponent {...ctx.args} />
        </FullScreen>
      ))
      .with(false, () => <ScreenComponent {...ctx.args} />)
      .exhaustive()

    const instance = inkRender(<MalttyProvider value={screenCtx}>{children}</MalttyProvider>)

    if (exitMode === 'auto') {
      const { unmount } = instance
      setTimeout(() => {
        unmount()
      }, 0)
    }

    try {
      await instance.waitUntilExit()
    } finally {
      if (isFullscreen) {
        process.stdout.write(LEAVE_ALT_SCREEN)
      }
    }
  }

  return withTag(
    {
      aliases: def.aliases,
      deprecated: resolveValue(def.deprecated),
      description: resolveValue(def.description),
      hidden: resolveValue(def.hidden),
      name: def.name,
      options: def.options,
      positionals: def.positionals,
      render: renderFn,
      strict: def.strict,
    },
    'Command'
  ) as Command
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Keys stripped from the screen context (no screen-safe equivalent).
 *
 * @private
 */
const STRIPPED_KEYS: ReadonlySet<ImperativeContextKeys> = new Set([
  'colors',
  'fail',
  'format',
  'prompts',
])

/**
 * Convert a full {@link CommandContext} into a {@link ScreenContext} by
 * replacing imperative I/O properties with React-backed implementations.
 *
 * Creates an {@link OutputStore} and swaps `log`, `status.spinner`, and any
 * middleware-decorated `report` with screen-backed versions that push
 * entries to the store. The store is attached via {@link OUTPUT_STORE_KEY}
 * (a private symbol) so `<Output />` can subscribe to it.
 *
 * @param ctx - The full command context.
 * @returns A ScreenContext with React-backed I/O.
 */
export function toScreenContext(ctx: CommandContext): ScreenContext {
  const store = createOutputStore()
  const screenLog = createScreenLog(store)
  const screenSpinner = createScreenSpinner(store)

  const ctxRecord = ctx as unknown as Record<string, unknown>
  const baseEntries = Object.keys(ctx)
    .filter((key) => !STRIPPED_KEYS.has(key as ImperativeContextKeys))
    .map((key) => [key, ctxRecord[key]] as const)

  const reportEntries = match('report' in ctx)
    .with(true, () => [['report', createScreenReport(store)] as const])
    .with(false, () => [] as readonly (readonly [string, unknown])[])
    .exhaustive()

  const screenCtx = injectOutputStore({
    ctx: Object.fromEntries([
      ...baseEntries,
      ['log', screenLog],
      ['status', { ...ctx.status, spinner: screenSpinner }],
      ...reportEntries,
    ]),
    store,
  })

  return Object.freeze(screenCtx) as unknown as ScreenContext
}

/**
 * Resolve a {@link Resolvable} value.
 *
 * @private
 */
function resolveValue<T>(value: Resolvable<T> | undefined): T | undefined {
  return match(isFunction(value))
    .with(true, () => (value as () => T)())
    .with(false, () => value as T | undefined)
    .exhaustive()
}
