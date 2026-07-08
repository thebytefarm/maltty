import type { Argv, Options as YargsOptions, PositionalOptions } from 'yargs'
import type { z } from 'zod'

import type { ArgsDef, Resolvable, YargsArgDef } from '@/types/index.js'

import {
  isZodSchema,
  resolvePositionalType,
  zodSchemaToYargsOptions,
  zodSchemaToYargsPositionals,
} from './zod.js'

interface RegisterCommandArgsOptions {
  readonly builder: Argv
  readonly options: ArgsDef | undefined
  readonly positionals: ArgsDef | undefined
}

/**
 * Register option and positional definitions on a yargs builder.
 *
 * Accepts `options` (flags) and `positionals` as either zod object schemas or
 * records of yargs-native arg definitions. Options are registered via
 * `builder.option()` and positionals via `builder.positional()`.
 *
 * @param params - Builder instance, option definitions, and positional definitions.
 * @returns Nothing; mutates the yargs builder in place.
 */
export function registerCommandArgs({
  builder,
  options,
  positionals,
}: RegisterCommandArgsOptions): void {
  if (positionals) {
    registerArgsDef({
      builder,
      def: positionals,
      register: (b, key, opt) => b.positional(key, opt),
      toYargsNative: yargsArgDefToPositional,
      toZod: zodSchemaToYargsPositionals,
    })
  }
  if (options) {
    registerArgsDef({
      builder,
      def: options,
      register: (b, key, opt) => b.option(key, opt),
      toYargsNative: yargsArgDefToOption,
      toZod: zodSchemaToYargsOptions,
    })
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface RegisterArgsDefOptions<TOption> {
  readonly builder: Argv
  readonly def: ArgsDef
  readonly register: (builder: Argv, key: string, opt: TOption) => Argv
  readonly toZod: (schema: z.ZodObject<z.ZodRawShape>) => Record<string, TOption>
  readonly toYargsNative: (def: YargsArgDef) => TOption
}

/**
 * Register an `ArgsDef` (Zod or yargs-native) on a yargs builder.
 *
 * @private
 * @param params - Registration parameters including the builder, definition, and converters.
 */
function registerArgsDef<TOption>(params: RegisterArgsDefOptions<TOption>): void {
  const { builder, def, register, toZod, toYargsNative } = params
  if (isZodSchema(def)) {
    const opts = toZod(def)
    Object.entries(opts).map(([key, opt]) => register(builder, key, opt))
  } else {
    Object.entries(def).map(([key, argDef]) => register(builder, key, toYargsNative(argDef)))
  }
}

/**
 * Convert a yargs-native arg definition into a yargs option object.
 *
 * @private
 * @param def - The yargs arg definition.
 * @returns A yargs option object.
 */
function yargsArgDefToOption(def: YargsArgDef): YargsOptions {
  return {
    alias: def.alias,
    choices: def.choices,
    default: def.default,
    demandOption: def.required ?? false,
    deprecated: resolveValue(def.deprecated),
    describe: def.description,
    group: def.group,
    hidden: resolveValue(def.hidden) ?? false,
    type: def.type,
  }
}

/**
 * Convert a yargs-native arg definition into a yargs positional option object.
 *
 * @private
 * @param def - The yargs arg definition for a positional.
 * @returns A yargs positional option object.
 */
function yargsArgDefToPositional(def: YargsArgDef): PositionalOptions {
  return {
    choices: def.choices as string[],
    default: def.default,
    demandOption: def.required ?? false,
    describe: def.description,
    type: resolvePositionalType(def.type),
  }
}

/**
 * Resolve a {@link Resolvable} value by invoking it if it is a function,
 * or returning the value directly.
 *
 * @private
 * @param value - A static value or zero-argument factory function.
 * @returns The resolved value, or `undefined` when the input is `undefined`.
 */
function resolveValue<T>(value: Resolvable<T> | undefined): T | undefined {
  if (typeof value === 'function') {
    return (value as () => T)()
  }
  return value
}
