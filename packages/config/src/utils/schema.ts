import type { Result } from '@kidd-cli/utils'
import { validate } from '@kidd-cli/utils/validate'
import { z } from 'zod'

import type {
  KiddConfig,
  SidecarChecksums,
  SidecarConfig,
  SidecarPlatformMapping,
  SidecarSource,
} from '../types.js'
import type { CompileTarget } from './compile.js'
import { compileTargets } from './compile.js'

/**
 * @private
 */
const compileTargetValues = compileTargets.map((entry) => entry.target) as [
  CompileTarget,
  ...CompileTarget[],
]

/**
 * @private
 */
const CompileTargetSchema = z.enum(compileTargetValues)

/**
 * @private
 */
const BuildOptionsSchema = z
  .object({
    clean: z.boolean().optional(),
    define: z.record(z.string(), z.string()).optional(),
    external: z.array(z.string()).optional(),
    minify: z.boolean().optional(),
    out: z.string().optional(),
    sourcemap: z.boolean().optional(),
    target: z.string().optional(),
  })
  .strict()

/**
 * @private
 */
const CompileOptionsSchema = z
  .object({
    autoloadDotenv: z.boolean().optional(),
    name: z.string().optional(),
    out: z.string().optional(),
    targets: z.array(CompileTargetSchema).optional(),
  })
  .strict()

/**
 * Discriminated union of supported sidecar sources.
 *
 * v1 supports a single `kind: 'github'` source describing a GitHub release
 * asset. The `kind` discriminator is included so future sources (`url`,
 * `npm`, `s3`, etc.) can be added without a breaking change.
 *
 * @example
 * ```ts
 * SidecarSourceSchema.parse({
 *   kind: 'github',
 *   repo: 'BurntSushi/ripgrep',
 *   asset: 'ripgrep-{version}-{triple}.tar.gz',
 * })
 * ```
 */
export const SidecarSourceSchema: z.ZodType<SidecarSource> = z
  .object({
    asset: z.string(),
    kind: z.literal('github'),
    repo: z.string(),
  })
  .strict()

/**
 * Per-platform mapping describing how to download a sidecar for a given target.
 *
 * Accepts either a plain string (the platform triple) or an object with an
 * explicit `triple` and an optional per-platform `asset` override.
 *
 * @example
 * ```ts
 * // string form — the triple is interpolated into the source asset template
 * SidecarPlatformMappingSchema.parse('aarch64-apple-darwin')
 *
 * // object form — overrides the asset template for this platform only
 * SidecarPlatformMappingSchema.parse({
 *   triple: 'x86_64-pc-windows-msvc',
 *   asset: 'tool-{version}-windows.zip',
 * })
 * ```
 */
export const SidecarPlatformMappingSchema: z.ZodType<SidecarPlatformMapping> = z.union([
  z.string(),
  z
    .object({
      asset: z.string().optional(),
      triple: z.string(),
    })
    .strict(),
])

/**
 * Optional integrity checksums for sidecar downloads.
 *
 * Pairs a hash `algorithm` with a `values` map keyed by platform triple (or
 * any opaque identifier the integrator controls) mapped to a hex-encoded digest.
 *
 * @example
 * ```ts
 * SidecarChecksumsSchema.parse({
 *   algorithm: 'sha256',
 *   values: {
 *     'aarch64-apple-darwin': 'd2c1...',
 *     'x86_64-unknown-linux-gnu': '9b3a...',
 *   },
 * })
 * ```
 */
export const SidecarChecksumsSchema: z.ZodType<SidecarChecksums> = z
  .object({
    algorithm: z.enum(['sha256', 'sha512']),
    values: z.record(z.string(), z.string()),
  })
  .strict()

/**
 * Validates the full {@link SidecarConfig} shape: `name`, `version`, `source`,
 * `platforms`, and the optional `lazy` and `checksums` fields. Uses `.strict()`
 * to reject unknown keys so configuration typos surface as validation errors.
 *
 * Platform keys are restricted to the {@link CompileTarget} union via
 * {@link CompileTargetSchema}, so misspelled platforms (e.g. `darwin-amd64`)
 * fail validation rather than being silently ignored.
 *
 * @example
 * ```ts
 * SidecarSchema.parse({
 *   name: 'rg',
 *   version: '14.1.1',
 *   source: { kind: 'github', repo: 'BurntSushi/ripgrep', asset: 'rg-{version}-{triple}.tar.gz' },
 *   platforms: { 'darwin-arm64': 'aarch64-apple-darwin' },
 * })
 * ```
 */
export const SidecarSchema: z.ZodType<SidecarConfig> = z
  .object({
    checksums: SidecarChecksumsSchema.optional(),
    lazy: z.boolean().optional(),
    name: z.string(),
    platforms: z.partialRecord(CompileTargetSchema, SidecarPlatformMappingSchema),
    source: SidecarSourceSchema,
    version: z.string(),
  })
  .strict()

/**
 * Zod schema validating the {@link KiddConfig} shape.
 */
export const KiddConfigSchema: z.ZodType<KiddConfig> = z
  .object({
    build: BuildOptionsSchema.optional(),
    commands: z.string().optional(),
    compile: z.union([z.boolean(), CompileOptionsSchema]).optional(),
    entry: z.string().optional(),
    include: z.array(z.string()).optional(),
    sidecars: z.array(SidecarSchema).optional(),
  })
  .strict()

/**
 * Validate arbitrary data against the {@link KiddConfigSchema}.
 *
 * @param data - The unknown value to validate.
 * @returns A Result tuple - `[null, KiddConfig]` on success or `[Error, null]` on failure.
 */
export function validateConfig(data: unknown): Result<KiddConfig, Error> {
  return validate({
    schema: KiddConfigSchema,
    params: data,
    createError: ({ message }) => new Error(`Invalid kidd config:\n  ${message}`),
  })
}
