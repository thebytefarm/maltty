import type { Readable, Writable } from 'node:stream'

import * as clack from '@clack/prompts'

import { DEFAULT_EXIT_CODE, createContextError } from './error.js'
import { resolveClackBase } from './resolve-defaults.js'
import type { Prompts } from './types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Per-call defaults merged into every clack prompt invocation.
 */
export interface PromptDefaults {
  /** Show navigation guide hints. */
  readonly guide?: boolean
  /** Custom input stream. */
  readonly input?: Readable
  /** Custom output stream. */
  readonly output?: Writable
}

/**
 * Options for {@link createContextPrompts}.
 */
export interface CreateContextPromptsOptions {
  /** Per-call defaults merged into every prompt. Method-level options win. */
  readonly defaults?: PromptDefaults
}

/**
 * Create the interactive prompt methods for a context.
 *
 * Each method delegates to `@clack/prompts` and unwraps cancel signals
 * into a ContextError so the CLI runner can exit cleanly.
 *
 * When `defaults` are provided, they are spread as the base of every clack
 * call. Method-level options always take precedence.
 *
 * @param options - Optional configuration with per-call defaults.
 * @returns A Prompts instance backed by clack.
 */
export function createContextPrompts(options?: CreateContextPromptsOptions): Prompts {
  const base = resolveClackBase(options?.defaults)

  return {
    async confirm(opts): Promise<boolean> {
      const result = await clack.confirm({ ...base, ...opts })
      return unwrapCancelSignal(result)
    },
    async multiselect<Type>(opts: Parameters<Prompts['multiselect']>[0]): Promise<Type[]> {
      const result = await clack.multiselect<Type>(
        // Accepted exception: generic context assembly requires casting through unknown.
        { ...base, ...opts } as unknown as Parameters<typeof clack.multiselect<Type>>[0]
      )
      return unwrapCancelSignal(result)
    },
    async password(opts): Promise<string> {
      const result = await clack.password({ ...base, ...opts })
      return unwrapCancelSignal(result)
    },
    async select<Type>(opts: Parameters<Prompts['select']>[0]): Promise<Type> {
      const result = await clack.select<Type>(
        // Accepted exception: generic context assembly requires casting through unknown.
        { ...base, ...opts } as unknown as Parameters<typeof clack.select<Type>>[0]
      )
      return unwrapCancelSignal(result)
    },
    async text(opts): Promise<string> {
      const result = await clack.text({ ...base, ...opts })
      return unwrapCancelSignal(result)
    },
    async autocomplete<Type>(opts: Parameters<Prompts['autocomplete']>[0]): Promise<Type> {
      const result = await clack.autocomplete<Type>(
        // Accepted exception: generic context assembly requires casting through unknown.
        { ...base, ...opts } as unknown as Parameters<typeof clack.autocomplete<Type>>[0]
      )
      return unwrapCancelSignal(result)
    },
    async autocompleteMultiselect<Type>(
      opts: Parameters<Prompts['autocompleteMultiselect']>[0]
    ): Promise<Type[]> {
      const result = await clack.autocompleteMultiselect<Type>(
        // Accepted exception: generic context assembly requires casting through unknown.
        { ...base, ...opts } as unknown as Parameters<typeof clack.autocompleteMultiselect<Type>>[0]
      )
      return unwrapCancelSignal(result)
    },
    async groupMultiselect<Type>(
      opts: Parameters<Prompts['groupMultiselect']>[0]
    ): Promise<Type[]> {
      const result = await clack.groupMultiselect<Type>(
        // Accepted exception: generic context assembly requires casting through unknown.
        { ...base, ...opts } as unknown as Parameters<typeof clack.groupMultiselect<Type>>[0]
      )
      return unwrapCancelSignal(result)
    },
    async selectKey<Type extends string>(opts: Parameters<Prompts['selectKey']>[0]): Promise<Type> {
      const result = await clack.selectKey<Type>(
        // Accepted exception: generic context assembly requires casting through unknown.
        { ...base, ...opts } as unknown as Parameters<typeof clack.selectKey<Type>>[0]
      )
      return unwrapCancelSignal(result)
    },
    async path(opts): Promise<string> {
      // Accepted exception: generic context assembly requires casting through unknown.
      const result = await clack.path({ ...base, ...opts } as unknown as Parameters<
        typeof clack.path
      >[0])
      return unwrapCancelSignal(result)
    },
    async group(prompts, opts) {
      const result = await clack.group(prompts as Parameters<typeof clack.group>[0], {
        onCancel: opts?.onCancel as Parameters<typeof clack.group>[1] extends infer O
          ? O extends { onCancel?: infer F }
            ? F
            : never
          : never,
      })
      // Accepted exception: generic context assembly requires type assertion.
      return result as Awaited<ReturnType<Prompts['group']>>
    },
  } as Prompts
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Unwrap a prompt result that may be a cancel symbol.
 *
 * If the user cancelled (Ctrl-C), throws a ContextError. Otherwise returns
 * the typed result value.
 *
 * @private
 * @param result - The raw prompt result (value or cancel symbol).
 * @returns The unwrapped typed value.
 */
function unwrapCancelSignal<Type>(result: Type | symbol): Type {
  if (clack.isCancel(result)) {
    clack.cancel('Operation cancelled.')
    // Accepted exception: prompt cancellation must propagate as an unwind.
    // The runner catches the thrown ContextError at the CLI boundary.
    throw createContextError('Prompt cancelled by user', {
      code: 'PROMPT_CANCELLED',
      exitCode: DEFAULT_EXIT_CODE,
    })
  }
  return result as Type
}
