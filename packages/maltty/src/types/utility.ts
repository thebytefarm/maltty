import type { ZodType } from 'zod'

// ---------------------------------------------------------------------------
// Generic type utilities
// ---------------------------------------------------------------------------

/**
 * A value that can be provided directly or as a zero-argument function that
 * produces the value. Resolved once at registration time via {@link resolveValue}.
 */
export type Resolvable<T> = T | (() => T)

/**
 * Merge two types, with TBase overriding TOverride.
 */
export type Merge<TBase, TOverride> = Omit<TBase, keyof TOverride> & TOverride

/**
 * String keys of a record.
 */
export type StringKeyOf<TRecord> = Extract<keyof TRecord, string>

/**
 * A record with string keys and unknown values. Used as the default constraint
 * for args, config, and general-purpose record types throughout the framework.
 */
export type AnyRecord = Record<string, unknown>

/**
 * Recursively makes all properties readonly.
 * Primitives and functions pass through unchanged.
 * Arrays become readonly tuples, objects get readonly properties at every depth.
 */
export type DeepReadonly<TType> = TType extends (...args: unknown[]) => unknown
  ? TType
  : TType extends readonly unknown[]
    ? { readonly [Key in keyof TType]: DeepReadonly<TType[Key]> }
    : TType extends object
      ? { readonly [Key in keyof TType]: DeepReadonly<TType[Key]> }
      : TType

/**
 * Detects the `any` type using the intersection trick.
 * `0 extends 1 & T` is only true when T is `any`.
 */
export type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Converts a union `A | B | C` to an intersection `A & B & C`
 * via the standard contravariant trick.
 */
export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never

/**
 * Extract the inferred output type from a zod schema, or fall back to a plain object.
 */
export type InferSchema<TSchema> = TSchema extends ZodType<infer TOutput> ? TOutput : AnyRecord
