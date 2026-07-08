/**
 * Check whether debug mode is enabled via the `MALTTY_DEBUG` or `DEBUG`
 * environment variables.
 *
 * `MALTTY_DEBUG` takes precedence; `DEBUG` is honored when `MALTTY_DEBUG` is unset.
 *
 * Truthy values: `"true"`, `"1"`
 * Falsy values: `"false"`, `"0"`, `undefined`, `null`
 *
 * @returns `true` when `MALTTY_DEBUG` or `DEBUG` is set to a truthy value.
 */
export function isDebug(): boolean {
  const value = process.env.MALTTY_DEBUG ?? process.env.DEBUG
  return value === 'true' || value === '1'
}
