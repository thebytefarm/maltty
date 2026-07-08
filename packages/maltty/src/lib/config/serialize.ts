import { extname } from 'node:path'

import { attempt, err, match, ok } from '@maltty/utils/fp'
import { jsonStringify } from '@maltty/utils/json'
import { stringify as yamlStringify } from 'yaml'

import type { ConfigFormat, ConfigOperationResult, ConfigWriteFormat } from './types.js'

/**
 * Determine the config format from a file path's extension.
 *
 * @param filePath - The file path to inspect.
 * @returns The detected config format.
 */
export function getFormat(filePath: string): ConfigFormat {
  const ext = extname(filePath)
  return match(ext)
    .with('.jsonc', () => 'jsonc' as const)
    .with('.json5', () => 'json5' as const)
    .with('.yaml', '.yml', () => 'yaml' as const)
    .with('.toml', () => 'toml' as const)
    .with('.ts', '.mts', '.cts', () => 'ts' as const)
    .with('.js', '.mjs', '.cjs', () => 'js' as const)
    .otherwise(() => 'json' as const)
}

/**
 * Serialize data to a string in the specified config format.
 *
 * @param data - The data to serialize.
 * @param format - The target config format.
 * @returns A ConfigOperationResult with the serialized string or an error.
 */
export function serializeContent(
  data: unknown,
  format: ConfigWriteFormat
): ConfigOperationResult<string> {
  return match(format)
    .with('json', 'jsonc', () => serializeJson(data))
    .with('yaml', () => serializeYaml(data))
    .exhaustive()
}

/**
 * Get the file extension string for a given write format.
 *
 * @param format - The config write format.
 * @returns The file extension including the leading dot (e.g. '.json').
 */
export function getExtension(format: ConfigWriteFormat): string {
  return match(format)
    .with('json', () => '.json')
    .with('jsonc', () => '.jsonc')
    .with('yaml', () => '.yaml')
    .exhaustive()
}

// ---------------------------------------------------------------------------

/**
 * Serialize data as pretty-printed JSON with a trailing newline.
 *
 * @private
 * @param data - The data to serialize.
 * @returns A ConfigOperationResult with the JSON string or a serialization error.
 */
function serializeJson(data: unknown): ConfigOperationResult<string> {
  const [serializeError, json] = jsonStringify(data, { pretty: true })
  if (serializeError) {
    return err(`Failed to serialize config as JSON: ${serializeError.message}`)
  }
  return ok(`${json}\n`)
}

/**
 * Serialize data as YAML.
 *
 * @private
 * @param data - The data to serialize.
 * @returns A ConfigOperationResult with the YAML string or a serialization error.
 */
function serializeYaml(data: unknown): ConfigOperationResult<string> {
  const [yamlError, yaml] = attempt(() => yamlStringify(data))
  if (yamlError) {
    return err(`Failed to serialize config as YAML: ${String(yamlError)}`)
  }
  // After the error guard, yaml is guaranteed to be a string
  return ok(yaml as string)
}
