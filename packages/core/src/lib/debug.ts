/**
 * Check whether debug mode is enabled via the `KIDD_DEBUG` or `DEBUG`
 * environment variables.
 *
 * `KIDD_DEBUG` takes precedence; `DEBUG` is honored when `KIDD_DEBUG` is unset.
 *
 * Truthy values: `"true"`, `"1"`
 * Falsy values: `"false"`, `"0"`, `undefined`, `null`
 *
 * @returns `true` when `KIDD_DEBUG` or `DEBUG` is set to a truthy value.
 */
export function isDebug(): boolean {
  const value = process.env.KIDD_DEBUG ?? process.env.DEBUG
  return value === 'true' || value === '1'
}
