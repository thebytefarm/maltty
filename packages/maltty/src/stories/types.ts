import type { Tagged } from '@maltty/utils/tag'
import type { ComponentType } from 'react'
import type { z } from 'zod'

/**
 * The kind of control used to edit a field in the story viewer.
 */
export type FieldControlKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'readonly'

/**
 * Describes a single editable field derived from a Zod schema property.
 */
export interface FieldDescriptor {
  readonly name: string
  readonly control: FieldControlKind
  readonly isOptional: boolean
  readonly defaultValue: unknown
  readonly description: string | undefined
  readonly options?: readonly string[]
  readonly zodTypeName: string
}

/**
 * A decorator wraps a story component to provide layout, context, or other
 * rendering concerns.
 */
export type Decorator = (
  StoryComponent: ComponentType<Record<string, unknown>>
) => ComponentType<Record<string, unknown>>

/**
 * Input definition for a single story created via {@link story}.
 */
export interface StoryDef<TProps extends object> {
  readonly name: string
  readonly component: ComponentType<TProps>
  readonly schema: z.ZodObject<z.ZodRawShape>
  readonly props: TProps
  readonly decorators?: readonly Decorator[]
  readonly description?: string
}

/**
 * A single variant inside a {@link StoriesGroupDef}.
 */
export interface StoryVariantDef<TProps extends object> {
  readonly props: TProps
  readonly decorators?: readonly Decorator[]
  readonly description?: string
}

/**
 * Input definition for a group of stories created via {@link stories}.
 *
 * When `defaults` is provided, its keys are merged under each variant's
 * `props` and excluded from the props editor in the viewer. This lets
 * you define fixed context (services, events, etc.) that stays constant
 * while variant props are the editable knobs.
 */
export interface StoriesGroupDef<TProps extends object> {
  readonly title: string
  readonly component: ComponentType<TProps>
  readonly schema: z.ZodObject<z.ZodRawShape>
  readonly defaults?: Partial<TProps>
  readonly decorators?: readonly Decorator[]
  readonly stories: Readonly<Record<string, StoryVariantDef<Partial<TProps>>>>
}

/**
 * Tagged output of the {@link story} factory. Represents a single renderable
 * story bound to a component, schema, and default props.
 */
export type Story<TProps extends object = Record<string, unknown>> = Tagged<
  {
    readonly name: string
    readonly component: ComponentType<TProps>
    readonly schema: z.ZodObject<z.ZodRawShape>
    readonly props: TProps
    readonly defaultKeys: readonly string[]
    readonly decorators: readonly Decorator[]
    readonly description: string | undefined
  },
  'Story'
>

/**
 * Tagged output of the {@link stories} factory. Groups multiple story variants
 * under a shared title, component, and schema.
 */
export type StoryGroup = Tagged<
  {
    readonly title: string
    readonly component: ComponentType<Record<string, unknown>>
    readonly schema: z.ZodObject<z.ZodRawShape>
    readonly decorators: readonly Decorator[]
    readonly stories: Readonly<Record<string, Story>>
  },
  'StoryGroup'
>

/**
 * A registry entry that is either a single {@link Story} or a {@link StoryGroup}.
 */
export type StoryEntry = Story | StoryGroup

/**
 * File suffixes that identify story files (e.g. `.stories.tsx`).
 * Shared between discovery and file watching.
 */
export const STORY_FILE_SUFFIXES: readonly string[] = [
  '.stories.tsx',
  '.stories.ts',
  '.stories.jsx',
  '.stories.js',
]

/**
 * File extensions for source files that may affect story rendering.
 * Used by the watcher to detect component changes.
 */
export const SOURCE_FILE_EXTENSIONS: readonly string[] = ['.tsx', '.ts', '.jsx', '.js']
