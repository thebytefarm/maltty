import type { ScreenContext } from '../../context/types.js'
import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Symbol key used to attach the {@link OutputStore} to the screen context.
 *
 * @private
 */
const OUTPUT_STORE_KEY: unique symbol = Symbol('maltty.outputStore')

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Options for {@link injectOutputStore}.
 */
interface InjectOutputStoreOptions {
  /**
   * The screen context record to extend.
   */
  readonly ctx: Record<string | symbol, unknown>
  /**
   * The output store to attach.
   */
  readonly store: OutputStore
}

/**
 * Return a new context with the {@link OutputStore} attached via a hidden
 * Symbol key. Does not mutate the original context.
 *
 * @param options - The injection options.
 * @returns A new record containing all original entries plus the store.
 */
export function injectOutputStore({
  ctx,
  store,
}: InjectOutputStoreOptions): Record<string | symbol, unknown> {
  return { ...ctx, [OUTPUT_STORE_KEY]: store }
}

/**
 * Retrieve the {@link OutputStore} from a screen context.
 *
 * Asserts that the store exists — this is a framework invariant
 * guaranteed by `screen()` calling {@link injectOutputStore}.
 *
 * @param ctx - The screen context to read from.
 * @returns The output store attached by {@link injectOutputStore}.
 */
export function getOutputStore(ctx: ScreenContext): OutputStore {
  const store = (ctx as unknown as Record<symbol, unknown>)[OUTPUT_STORE_KEY] as
    | OutputStore
    | undefined

  if (store === undefined) {
    // Framework invariant — always a programmer error, not a recoverable failure.
    // eslint-disable-next-line no-throw-literal
    throw new Error(
      'OutputStore not found on ScreenContext. Ensure useOutputStore is called within a screen() context.'
    )
  }

  return store
}
