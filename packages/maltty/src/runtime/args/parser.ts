import { ok } from '@maltty/utils/fp'
import type { Result } from '@maltty/utils/fp'
import { validate } from '@maltty/utils/validate'
import type { z } from 'zod'

import type { ArgsDef } from '@/types/index.js'

import type { ArgsParser } from '../types.js'
import { isZodSchema } from './zod.js'

interface CreateArgsParserOptions {
  readonly options: ArgsDef | undefined
  readonly positionals: ArgsDef | undefined
}

/**
 * Create an args parser that cleans and validates raw parsed arguments.
 *
 * Captures both option and positional definitions in a closure and returns an
 * ArgsParser whose `parse` method strips yargs-internal keys and validates
 * against a merged zod schema when one is defined.
 *
 * @param defs - The option and positional definitions from the command.
 * @returns An ArgsParser with a parse method.
 */
export function createArgsParser(defs: CreateArgsParserOptions): ArgsParser {
  const mergedSchema = buildMergedSchema(defs.options, defs.positionals)
  return {
    parse(rawArgs: Record<string, unknown>): Result<Record<string, unknown>, Error> {
      const cleaned = cleanParsedArgs(rawArgs)
      return validateArgs(mergedSchema, cleaned)
    },
  } satisfies ArgsParser
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build a merged Zod schema from options and positionals definitions.
 *
 * When both are Zod schemas, merges them into a single schema for validation.
 * When only one is a Zod schema, returns that schema with `.passthrough()` so
 * yargs-native keys from the other side are preserved. When neither is Zod,
 * returns undefined (no validation).
 *
 * @private
 * @param options - Option definitions (flags).
 * @param positionals - Positional argument definitions.
 * @returns A merged Zod schema or undefined.
 */
function buildMergedSchema(
  options: ArgsDef | undefined,
  positionals: ArgsDef | undefined
): z.ZodObject<z.ZodRawShape> | undefined {
  const optionsIsZod = options && isZodSchema(options)
  const positionalsIsZod = positionals && isZodSchema(positionals)
  if (optionsIsZod && positionalsIsZod) {
    return options.merge(positionals)
  }
  if (optionsIsZod) {
    return options.passthrough()
  }
  if (positionalsIsZod) {
    return positionals.passthrough()
  }
  return undefined
}

/**
 * Strip yargs-internal keys (`_`, `$0`) and camelCase-duplicated hyphenated keys
 * from a parsed argv record, returning only user-defined arguments.
 *
 * @private
 * @param argv - Raw parsed argv from yargs.
 * @returns A cleaned record containing only user-defined arguments.
 */
function cleanParsedArgs(argv: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(argv).filter(([key]) => key !== '_' && key !== '$0' && !key.includes('-'))
  )
}

/**
 * Validate parsed arguments against a zod schema when one is defined.
 *
 * When no zod schema is present, the parsed args are returned as-is.
 * When a zod schema is present, validation is performed and a Result error
 * is returned on failure.
 *
 * @private
 * @param schema - The merged zod schema or undefined.
 * @param parsedArgs - The cleaned parsed arguments.
 * @returns A Result containing validated arguments (zod-parsed when applicable).
 */
function validateArgs(
  schema: z.ZodObject<z.ZodRawShape> | undefined,
  parsedArgs: Record<string, unknown>
): Result<Record<string, unknown>, Error> {
  if (!schema) {
    return ok(parsedArgs)
  }
  return validate({
    schema,
    params: parsedArgs,
    createError: ({ message }) => new Error(`Invalid arguments:\n  ${message}`),
  })
}
