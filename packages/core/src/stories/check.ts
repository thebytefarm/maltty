import { hasTag } from '@kidd-cli/utils/tag'
import { P, match } from 'ts-pattern'

import type { Story, StoryEntry, StoryGroup } from './types.js'
import { validateProps } from './validate.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of editable fields (schema keys minus default keys) per story. */
export const MAX_EDITABLE_FIELDS = 6

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single diagnostic from story validation.
 */
export interface StoryDiagnostic {
  readonly storyName: string
  readonly severity: 'error' | 'warning'
  readonly message: string
}

/**
 * Result of checking all discovered stories.
 */
export interface CheckResult {
  readonly diagnostics: readonly StoryDiagnostic[]
  readonly storyCount: number
  readonly passed: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Validate all discovered story entries for common issues:
 *
 * - Too many editable fields (schema keys minus defaultKeys exceeds {@link MAX_EDITABLE_FIELDS})
 * - Props validation errors against the schema
 * - Missing required props
 *
 * @param entries - The discovered story entries to check.
 * @returns A frozen {@link CheckResult} with all diagnostics.
 */
export function checkStories(entries: ReadonlyMap<string, StoryEntry>): CheckResult {
  const diagnostics = [...entries.values()].flatMap(checkEntry)
  const storyCount = countStories(entries)

  return Object.freeze({
    diagnostics: Object.freeze(diagnostics),
    storyCount,
    passed: diagnostics.filter((d) => d.severity === 'error').length === 0,
  })
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Check a single entry (story or group) and return diagnostics.
 *
 * @private
 * @param entry - The story entry to check.
 * @returns An array of diagnostics for this entry.
 */
function checkEntry(entry: StoryEntry): readonly StoryDiagnostic[] {
  if (hasTag(entry, 'Story')) {
    return checkSingleStory(entry as Story)
  }

  if (hasTag(entry, 'StoryGroup')) {
    const group = entry as StoryGroup
    return Object.entries(group.stories).flatMap(([variantName, variant]) =>
      checkSingleStory(variant, group.title).map((d) =>
        Object.freeze({
          storyName: `${group.title} / ${variantName}`,
          severity: d.severity,
          message: d.message,
        })
      )
    )
  }

  return []
}

/**
 * Check a single story for field count and prop validation issues.
 *
 * @private
 * @param story - The story to check.
 * @param groupTitle - Optional group title for qualified naming.
 * @returns An array of diagnostics for this story.
 */
function checkSingleStory(story: Story, groupTitle?: string): readonly StoryDiagnostic[] {
  const name = match(groupTitle)
    .with(P.string, (title) => `${title} / ${story.name}`)
    .with(P.nullish, () => story.name)
    .exhaustive()

  const editableFieldCount = countEditableFields(story)
  const fieldCountDiagnostics = buildFieldCountDiagnostics({ editableFieldCount, name })

  const propDiagnostics = validateProps({ schema: story.schema, props: story.props }).map(
    (fieldError) =>
      Object.freeze({
        storyName: name,
        severity: 'error' as const,
        message: `Prop "${fieldError.field}": ${fieldError.message}`,
      })
  )

  return [...fieldCountDiagnostics, ...propDiagnostics]
}

/**
 * Build the diagnostics array for editable-field count violations.
 *
 * @private
 * @param params - The current count and the qualified story name.
 * @returns A single diagnostic when the count exceeds the max, else empty.
 */
function buildFieldCountDiagnostics(params: {
  readonly editableFieldCount: number
  readonly name: string
}): readonly StoryDiagnostic[] {
  if (params.editableFieldCount > MAX_EDITABLE_FIELDS) {
    return [
      Object.freeze({
        storyName: params.name,
        severity: 'error' as const,
        message: `Too many editable fields: ${String(params.editableFieldCount)} (max ${String(MAX_EDITABLE_FIELDS)}). Move fields to \`defaults\` to reduce.`,
      }),
    ]
  }
  return []
}

/**
 * Count the number of editable fields for a story (schema keys minus default keys).
 *
 * @private
 * @param story - The story to inspect.
 * @returns The number of editable fields.
 */
function countEditableFields(story: Story): number {
  const schemaKeys = Object.keys(story.schema.shape as Record<string, unknown>)
  const hiddenKeys = new Set(story.defaultKeys)
  return schemaKeys.filter((key) => !hiddenKeys.has(key)).length
}

/**
 * Count total individual stories across all entries.
 *
 * @private
 * @param entries - The discovered story entries.
 * @returns The total number of stories.
 */
function countStories(entries: ReadonlyMap<string, StoryEntry>): number {
  return [...entries.values()].reduce((count, entry) => {
    if (hasTag(entry, 'Story')) {
      return count + 1
    }
    if (hasTag(entry, 'StoryGroup')) {
      return count + Object.keys((entry as StoryGroup).stories).length
    }
    return count
  }, 0)
}
