// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Shared props for all interactive prompt components.
 *
 * Every prompt accepts `focused` and `disabled` so that hosts (like the
 * stories viewer) can control input routing through explicit props.
 *
 * - `focused` — whether the component currently owns keyboard input.
 * - `disabled` — whether the component is visually and functionally disabled.
 *
 * When neither is provided, the component defaults to focused and enabled.
 */
export interface PromptProps {
  /** Whether the component currently has input focus. @default true */
  readonly focused?: boolean

  /** Whether the component is visually and functionally disabled. @default false */
  readonly disabled?: boolean
}

/**
 * A single option in a prompt component.
 *
 * A single option in a prompt component with support for generic values,
 * disabled state, and hint text.
 *
 * @typeParam TValue - The type of the option's value.
 */
export interface PromptOption<TValue> {
  /** The value returned when this option is selected. */
  readonly value: TValue

  /** The display label shown to the user. */
  readonly label: string

  /** Optional hint text shown dimmed beside the label. */
  readonly hint?: string

  /** When `true`, the option is shown but not selectable. */
  readonly disabled?: boolean
}
