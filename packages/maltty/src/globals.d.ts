/**
 * Compile-time CLI version injected by the maltty bundler.
 *
 * Set via `define: { __MALTTY_VERSION__: JSON.stringify(version) }` during
 * the tsdown build. Falls back to `undefined` when building outside the
 * maltty bundler pipeline.
 */
declare const __MALTTY_VERSION__: string | undefined
