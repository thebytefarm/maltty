/**
 * File extensions allowed for the short config name (e.g. `maltty.json`, `maltty.yaml`).
 *
 * TS/JS extensions are excluded — use the `name.config.*` pattern for those.
 */
export const CONFIG_DATA_EXTENSIONS: ReadonlySet<string> = new Set([
  '.json',
  '.jsonc',
  '.json5',
  '.yaml',
  '.yml',
  '.toml',
])
