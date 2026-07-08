import { match } from 'ts-pattern'
import type { Options as YargsOptions, PositionalOptions } from 'yargs'
import type { z } from 'zod'

/**
 * Metadata for a single positional argument extracted from a Zod schema.
 */
export interface PositionalMeta {
  readonly name: string
  readonly isOptional: boolean
}

/**
 * Type guard that checks whether a value is a zod object schema.
 *
 * @param args - The value to check.
 * @returns True when args is a ZodObject.
 */
export function isZodSchema(args: unknown): args is z.ZodObject<z.ZodRawShape> {
  return (
    typeof args === 'object' &&
    args !== null &&
    Object.hasOwn(args as object, '_def') &&
    typeof (args as { _def: unknown })._def === 'object' &&
    (args as { _def: { type?: string } })._def !== null &&
    (args as { _def: { type?: string } })._def.type === 'object'
  )
}

/**
 * Convert an entire zod object schema into a record of yargs options.
 *
 * @param schema - The zod object schema.
 * @returns A record mapping field names to yargs option definitions.
 */
export function zodSchemaToYargsOptions(
  schema: z.ZodObject<z.ZodRawShape>
): Record<string, YargsOptions> {
  return mapSchemaShape(schema, (fieldSchema) =>
    buildZodFieldOption(fieldSchema, resolveZodYargsType)
  ) as Record<string, YargsOptions>
}

/**
 * Extract positional metadata from a zod object schema.
 *
 * Returns an ordered array of positional names with their required/optional status.
 * Key order from `Object.keys(schema.shape)` determines positional order.
 *
 * @param schema - The zod object schema for positionals.
 * @returns An ordered array of positional metadata.
 */
export function zodSchemaToPositionalMeta(
  schema: z.ZodObject<z.ZodRawShape>
): readonly PositionalMeta[] {
  return getShapeEntries(schema).map(([key, fieldSchema]): PositionalMeta => {
    const { isOptional } = unwrapZodType(fieldSchema)
    return { isOptional, name: key }
  })
}

/**
 * Convert a zod object schema into a record of yargs positional options.
 *
 * Each field in the schema becomes a positional argument. Positionals support
 * `string`, `number`, and `boolean` types — other types fall back to `string`.
 *
 * @param schema - The zod object schema for positionals.
 * @returns A record mapping field names to yargs positional option definitions.
 */
export function zodSchemaToYargsPositionals(
  schema: z.ZodObject<z.ZodRawShape>
): Record<string, PositionalOptions> {
  return mapSchemaShape(schema, (fieldSchema) =>
    buildZodFieldOption(fieldSchema, resolvePositionalType)
  ) as Record<string, PositionalOptions>
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface ZodDef {
  type?: string
  innerType?: z.ZodTypeAny
  defaultValue?: unknown
  entries?: Readonly<Record<string, string>>
}

interface ZodTypeInfo {
  defaultValue: unknown
  inner: z.ZodTypeAny
  isOptional: boolean
}

interface UnwrapOptions {
  def: ZodDef
  current: z.ZodTypeAny
  defaultValue: unknown
}

interface UnwrapRecursiveOptions {
  current: z.ZodTypeAny
  isOptional: boolean
  defaultValue: unknown
}

/**
 * Extract typed shape entries from a zod object schema.
 *
 * @private
 * @param schema - The zod object schema.
 * @returns An array of [key, fieldSchema] pairs.
 */
function getShapeEntries(schema: z.ZodObject<z.ZodRawShape>): readonly [string, z.ZodTypeAny][] {
  const shape = schema.shape as Record<string, z.ZodTypeAny>
  return Object.entries(shape)
}

/**
 * Map every field in a zod object schema through a converter, returning a record.
 *
 * @private
 * @param schema - The zod object schema.
 * @param converter - A function converting a single zod field schema to a yargs option.
 * @returns A record mapping field names to converted option definitions.
 */
function mapSchemaShape<TOption>(
  schema: z.ZodObject<z.ZodRawShape>,
  converter: (fieldSchema: z.ZodTypeAny) => TOption
): Record<string, TOption> {
  return Object.fromEntries(
    getShapeEntries(schema).map(([key, fieldSchema]): [string, TOption] => [
      key,
      converter(fieldSchema),
    ])
  )
}

/**
 * Extract a default value from a zod definition, falling back to the provided value.
 *
 * @private
 * @param def - The zod definition to inspect.
 * @param fallback - Value to return when no default is defined.
 * @returns The resolved default value.
 */
function resolveDefaultValue(def: ZodDef, fallback: unknown): unknown {
  if (def.defaultValue !== undefined) {
    return def.defaultValue
  }
  return fallback
}

/**
 * Unwrap a ZodOptional type, recursing into the inner type.
 *
 * @private
 * @param options - The unwrap options containing def, current type, and default value.
 * @returns Unwrapped type information.
 */
function unwrapOptional(options: UnwrapOptions): ZodTypeInfo {
  const { def, current, defaultValue } = options
  if (def.innerType) {
    return unwrapZodTypeRecursive({ current: def.innerType, defaultValue, isOptional: true })
  }
  return { defaultValue, inner: current, isOptional: true }
}

/**
 * Unwrap a ZodDefault type, resolving its default value and recursing.
 *
 * @private
 * @param options - The unwrap options containing def, current type, and default value.
 * @returns Unwrapped type information with the resolved default.
 */
function unwrapDefault(options: UnwrapOptions): ZodTypeInfo {
  const { def, current, defaultValue } = options
  const newDefault = resolveDefaultValue(def, defaultValue)
  if (def.innerType) {
    return unwrapZodTypeRecursive({
      current: def.innerType,
      defaultValue: newDefault,
      isOptional: true,
    })
  }
  return { defaultValue: newDefault, inner: current, isOptional: true }
}

/**
 * Recursively unwrap optional and default wrappers from a zod type.
 *
 * @private
 * @param options - The recursive unwrap options containing current type, optionality flag, and default value.
 * @returns The fully unwrapped type information.
 */
function unwrapZodTypeRecursive(options: UnwrapRecursiveOptions): ZodTypeInfo {
  const { current, isOptional, defaultValue } = options
  const def = (current as { _def: ZodDef })._def
  if (def.type === 'optional') {
    return unwrapOptional({ current, def, defaultValue })
  }
  if (def.type === 'default') {
    return unwrapDefault({ current, def, defaultValue })
  }
  return { defaultValue, inner: current, isOptional }
}

/**
 * Unwrap a zod schema to extract its base type, optionality, and default value.
 *
 * @private
 * @param schema - The zod type to unwrap.
 * @returns The unwrapped type information.
 */
function unwrapZodType(schema: z.ZodTypeAny): ZodTypeInfo {
  return unwrapZodTypeRecursive({ current: schema, defaultValue: undefined, isOptional: false })
}

/**
 * Map a zod type name to a yargs option type string.
 *
 * @private
 * @param typeName - The zod type name (e.g. 'string', 'number').
 * @returns The corresponding yargs type.
 */
function resolveZodYargsType(
  typeName: string | undefined
): 'string' | 'number' | 'boolean' | 'array' {
  return match(typeName)
    .with('string', () => 'string' as const)
    .with('number', () => 'number' as const)
    .with('boolean', () => 'boolean' as const)
    .with('array', () => 'array' as const)
    .otherwise(() => 'string' as const)
}

/**
 * Map a type name to a valid yargs positional type.
 *
 * Positionals support `'string'`, `'number'`, and `'boolean'`.
 * All other types fall back to `'string'`. Used for both Zod and
 * yargs-native positional definitions.
 *
 * @param typeName - The type name to resolve.
 * @returns A positional-compatible type.
 */
export function resolvePositionalType(
  typeName: string | undefined
): 'string' | 'number' | 'boolean' {
  return match(typeName)
    .with('number', () => 'number' as const)
    .with('boolean', () => 'boolean' as const)
    .otherwise(() => 'string' as const)
}

/**
 * Extract enum choices from a zod definition when it represents a ZodEnum.
 *
 * @private
 * @param def - The zod definition to inspect.
 * @returns An object with `choices` if the def is an enum, otherwise empty.
 */
function resolveEnumChoices(
  def: ZodDef
): { readonly choices: readonly string[] } | Record<string, never> {
  if (def.type === 'enum' && def.entries) {
    return { choices: Object.values(def.entries) }
  }
  return {}
}

/**
 * Build a base yargs option from a zod schema's description and default.
 *
 * @private
 * @param inner - The unwrapped zod schema instance.
 * @param defaultValue - The resolved default value.
 * @returns A partial yargs option object.
 */
function buildBaseOption(inner: z.ZodTypeAny, defaultValue: unknown): YargsOptions {
  const { description } = inner as { description?: string }
  const base: Record<string, unknown> = {}
  if (description) {
    base.describe = description
  }
  if (defaultValue !== undefined) {
    base.default = defaultValue
  }
  return base as YargsOptions
}

/**
 * Convert a single zod field schema into a yargs option or positional definition.
 *
 * Accepts a type resolver to support both full options (string/number/boolean/array)
 * and positionals (string/number only).
 *
 * @private
 * @param schema - A single zod field type.
 * @param typeResolver - Function to map zod type name to a yargs-compatible type.
 * @returns A yargs option/positional object.
 */
function buildZodFieldOption(
  schema: z.ZodTypeAny,
  typeResolver: (typeName: string | undefined) => string
): Record<string, unknown> {
  const { inner, isOptional, defaultValue } = unwrapZodType(schema)
  const innerDef = (inner as { _def: ZodDef })._def
  const base = {
    ...buildBaseOption(inner, defaultValue),
    ...resolveEnumChoices(innerDef),
    type: typeResolver(innerDef.type),
  }
  if (!isOptional) {
    return { ...base, demandOption: true }
  }
  return base
}
