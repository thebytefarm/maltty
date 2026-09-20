import { match } from 'ts-pattern'
import type { z } from 'zod'

import type { FieldControlKind, FieldDescriptor } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Introspect a Zod object schema into an array of field descriptors
 * suitable for rendering prop editor controls.
 *
 * @param schema - The Zod object schema to introspect.
 * @returns An array of frozen field descriptors, one per schema property.
 */
export function schemaToFieldDescriptors(
  schema: z.ZodObject<z.ZodRawShape>
): readonly FieldDescriptor[] {
  const shape = schema.shape as Record<string, z.ZodTypeAny>
  return Object.entries(shape).map(([name, fieldSchema]) => {
    const { inner, isOptional, defaultValue } = unwrapZodType(fieldSchema)
    const innerDef = (inner as { _def: ZodDef })._def
    const typeName = innerDef.type ?? 'unknown'
    const control = resolveControlKind({ typeName, def: innerDef })
    const { description } = inner as { description?: string }

    return Object.freeze({
      name,
      control,
      isOptional,
      defaultValue,
      description,
      options: extractOptions(typeName, innerDef),
      zodTypeName: typeName,
    })
  })
}

/**
 * Map a Zod type name and definition to a field control kind.
 *
 * @param options - The type name and Zod definition to resolve.
 * @returns The resolved control kind for the prop editor.
 */
export function resolveControlKind({
  typeName,
  def,
}: {
  readonly typeName: string
  readonly def: ZodDef
}): FieldControlKind {
  return match(typeName)
    .with('string', () => 'text' as const)
    .with('number', () => 'number' as const)
    .with('boolean', () => 'boolean' as const)
    .with('enum', () => 'select' as const)
    .with('nativeEnum', () => 'select' as const)
    .with('literal', () => 'readonly' as const)
    .with('array', () => resolveArrayControlKind(def))
    .with('object', () => 'json' as const)
    .otherwise(() => 'json' as const)
}

/**
 * Minimal Zod definition shape used for schema introspection.
 */
export interface ZodDef {
  readonly type?: string
  readonly innerType?: z.ZodTypeAny
  readonly defaultValue?: unknown
  readonly entries?: Readonly<Record<string, string>>
  readonly values?: readonly unknown[]
  readonly element?: z.ZodTypeAny
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface ZodTypeInfo {
  readonly defaultValue: unknown
  readonly inner: z.ZodTypeAny
  readonly isOptional: boolean
}

interface UnwrapRecursiveOptions {
  readonly current: z.ZodTypeAny
  readonly isOptional: boolean
  readonly defaultValue: unknown
}

/**
 * Recursively unwrap optional and default wrappers from a Zod type.
 *
 * @private
 * @param options - The recursive unwrap state.
 * @returns The fully unwrapped type information.
 */
function unwrapZodTypeRecursive(options: UnwrapRecursiveOptions): ZodTypeInfo {
  const { current, isOptional, defaultValue } = options
  const def = (current as { _def: ZodDef })._def

  return match(def.type)
    .with('optional', () => {
      if (def.innerType) {
        return unwrapZodTypeRecursive({ current: def.innerType, defaultValue, isOptional: true })
      }
      return { defaultValue, inner: current, isOptional: true }
    })
    .with('default', () => {
      const newDefault = resolveDefaultValue(def.defaultValue, defaultValue)
      if (def.innerType) {
        return unwrapZodTypeRecursive({
          current: def.innerType,
          defaultValue: newDefault,
          isOptional: true,
        })
      }
      return { defaultValue: newDefault, inner: current, isOptional: true }
    })
    .otherwise(() => ({ defaultValue, inner: current, isOptional }))
}

/**
 * Unwrap a Zod schema to extract its base type, optionality, and default value.
 *
 * @private
 * @param schema - The Zod type to unwrap.
 * @returns The unwrapped type information.
 */
function unwrapZodType(schema: z.ZodTypeAny): ZodTypeInfo {
  return unwrapZodTypeRecursive({ current: schema, defaultValue: undefined, isOptional: false })
}

/**
 * Resolve a default value, preferring a defined value over the fallback.
 *
 * @private
 * @param value - The candidate default value from the Zod definition.
 * @param fallback - The fallback value when the candidate is undefined.
 * @returns The resolved default value.
 */
function resolveDefaultValue(value: unknown, fallback: unknown): unknown {
  if (value === undefined) {
    return fallback
  }
  if (typeof value === 'function') {
    return (value as () => unknown)()
  }
  return value
}

/**
 * Extract string options from enum-like Zod definitions.
 *
 * @private
 * @param typeName - The Zod type name.
 * @param def - The Zod definition to inspect.
 * @returns An array of string options, or undefined for non-enum types.
 */
function extractOptions(typeName: string, def: ZodDef): readonly string[] | undefined {
  return match(typeName)
    .with('enum', 'nativeEnum', () => extractEnumEntries(def))
    .with('array', () => extractArrayElementOptions(def))
    .otherwise(() => undefined)
}

/**
 * Extract enum entries from a Zod enum or nativeEnum definition.
 *
 * @private
 * @param def - The Zod definition to inspect.
 * @returns An array of string options, or undefined.
 */
function extractEnumEntries(def: ZodDef): readonly string[] | undefined {
  if (def.entries) {
    return Object.values(def.entries).map(String)
  }
  return undefined
}

/**
 * Extract options from an array element type when the element is an enum.
 *
 * @private
 * @param def - The Zod array definition to inspect.
 * @returns An array of string options, or undefined.
 */
function extractArrayElementOptions(def: ZodDef): readonly string[] | undefined {
  if (def.element) {
    const elementDef = (def.element as { _def: ZodDef })._def
    if (elementDef.type === 'enum' || elementDef.type === 'nativeEnum') {
      return extractEnumEntries(elementDef)
    }
  }
  return undefined
}

/**
 * Determine the control kind for an array type based on its element type.
 *
 * @private
 * @param def - The Zod array definition.
 * @returns `'multiselect'` when the element type is an enum, otherwise `'json'`.
 */
function resolveArrayControlKind(def: ZodDef): FieldControlKind {
  if (def.element) {
    const elementDef = (def.element as { _def: ZodDef })._def
    if (elementDef.type === 'enum' || elementDef.type === 'nativeEnum') {
      return 'multiselect'
    }
  }
  return 'json'
}
