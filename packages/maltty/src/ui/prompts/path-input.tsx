import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import { ErrorMessage } from '../display/error-message.js'
import { colors } from '../theme.js'
import { insertCharAt, removeCharAt } from './string-utils.js'
import type { PromptProps } from './types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SUGGESTIONS = 5

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link PathInput} component.
 */
export interface PathInputProps extends PromptProps {
  /** Root directory for completion lookups. Defaults to `process.cwd()`. */
  readonly root?: string

  /** When `true`, only directories are suggested and accepted. */
  readonly directoryOnly?: boolean

  /** Initial value for the input. */
  readonly defaultValue?: string

  /** Validation function. Return a string message on error, or `undefined` on success. */
  readonly validate?: (value: string) => string | undefined

  /** Called whenever the input value changes. */
  readonly onChange?: (value: string) => void

  /** Called when the user presses Enter to confirm. */
  readonly onSubmit?: (value: string) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * File path input with tab-completion from the filesystem.
 *
 * Renders a text input that reads directory entries from `root` on Tab
 * press and cycles through matching completions. Up to 5 suggestions
 * are shown below the input. Validation runs on Enter and errors are
 * displayed in red.
 *
 * @param props - The path input props.
 * @returns A rendered path input element.
 */
export function PathInput({
  root,
  directoryOnly = false,
  defaultValue = '',
  validate,
  onChange,
  onSubmit,
  focused = true,
  disabled = false,
}: PathInputProps): ReactElement {
  const resolvedRoot = root ?? process.cwd()
  const [value, setValue] = useState(defaultValue)
  const [cursorOffset, setCursorOffset] = useState(defaultValue.length)
  const [suggestions, setSuggestions] = useState<readonly string[]>([])
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [error, setError] = useState<string | undefined>(undefined)

  useInput(
    (input, key) => {
      if (key.tab) {
        const matches = readCompletions({
          root: resolvedRoot,
          partial: value,
          directoryOnly,
        })
        setSuggestions(matches)
        if (matches.length > 0) {
          const nextIndex = match(suggestions.length > 0)
            .with(true, () => (suggestionIndex + 1) % matches.length)
            .with(false, () => 0)
            .exhaustive()
          setSuggestionIndex(nextIndex)
          const completed = matches[nextIndex] ?? value
          setValue(completed)
          setCursorOffset(completed.length)
          setError(undefined)
          if (onChange) {
            onChange(completed)
          }
        }
        return
      }

      if (key.return) {
        if (validate) {
          const validationError = validate(value)
          if (validationError !== undefined) {
            setError(validationError)
            return
          }
        }
        setError(undefined)
        if (onSubmit) {
          onSubmit(value)
        }
        return
      }

      if (key.leftArrow) {
        setCursorOffset(Math.max(0, cursorOffset - 1))
        return
      }

      if (key.rightArrow) {
        setCursorOffset(Math.min(value.length, cursorOffset + 1))
        return
      }

      if (key.backspace) {
        if (cursorOffset > 0) {
          const nextValue = removeCharAt({ str: value, index: cursorOffset - 1 })
          setValue(nextValue)
          setCursorOffset(cursorOffset - 1)
          setSuggestions([])
          setSuggestionIndex(0)
          setError(undefined)
          if (onChange) {
            onChange(nextValue)
          }
        }
        return
      }

      if (input && !key.ctrl && !key.meta) {
        const nextValue = insertCharAt({ str: value, index: cursorOffset, chars: input })
        setValue(nextValue)
        setCursorOffset(cursorOffset + input.length)
        setSuggestions([])
        setSuggestionIndex(0)
        setError(undefined)
        if (onChange) {
          onChange(nextValue)
        }
      }
    },
    { isActive: focused && !disabled }
  )

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={colors.primary} bold>
          {'> '}
        </Text>
        <Text dimColor={disabled}>{value}</Text>
      </Box>
      {match(suggestions.length > 0)
        .with(true, () => (
          <Box flexDirection="column" paddingLeft={2}>
            {suggestions.slice(0, MAX_SUGGESTIONS).map((suggestion, index) => (
              <Text
                key={suggestion}
                dimColor={index !== suggestionIndex}
                color={match(index === suggestionIndex)
                  .with(true, () => colors.primary)
                  .with(false, () => undefined)
                  .exhaustive()}
              >
                {suggestion}
              </Text>
            ))}
          </Box>
        ))
        .with(false, () => null)
        .exhaustive()}
      <ErrorMessage message={error} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Options for reading filesystem completions.
 *
 * @private
 */
interface ReadCompletionsOptions {
  readonly root: string
  readonly partial: string
  readonly directoryOnly: boolean
}

/**
 * Read directory entries matching a partial path from the filesystem.
 *
 * @private
 * @param opts - The completion options.
 * @returns An array of matching path strings relative to root.
 */
function readCompletions({
  root,
  partial,
  directoryOnly,
}: ReadCompletionsOptions): readonly string[] {
  const [dirPart, prefix] = splitPartial(partial)
  const targetDir = resolve(root, dirPart)

  const [readError, entries] = safeReaddir(targetDir)
  if (readError !== null) {
    return []
  }

  const filtered = entries.filter((entry) => {
    if (!entry.toLowerCase().startsWith(prefix.toLowerCase())) {
      return false
    }
    if (directoryOnly) {
      return isDirectory(join(targetDir, entry))
    }
    return true
  })

  return filtered.map((entry) =>
    match(dirPart)
      .with('', () => entry)
      .otherwise((dir) => `${dir}/${entry}`)
  )
}

/**
 * Split a partial path into the directory portion and the filename prefix.
 *
 * @private
 * @param partial - The partial path string.
 * @returns A tuple of [directory, prefix].
 */
function splitPartial(partial: string): readonly [string, string] {
  const lastSlash = partial.lastIndexOf('/')
  if (lastSlash === -1) {
    return ['', partial]
  }
  return [partial.slice(0, lastSlash), partial.slice(lastSlash + 1)]
}

/**
 * Safely read a directory, returning a Result tuple.
 *
 * @private
 * @param dir - The directory path.
 * @returns A Result tuple with entries or an error.
 */
function safeReaddir(dir: string): readonly [Error, null] | readonly [null, readonly string[]] {
  try {
    const entries = readdirSync(dir)
    return [null, entries]
  } catch (error: unknown) {
    const resolvedError = match(error instanceof Error)
      .with(true, () => error as Error)
      .with(false, () => new Error(String(error)))
      .exhaustive()
    return [resolvedError, null]
  }
}

/**
 * Check whether a path is a directory.
 *
 * @private
 * @param path - The filesystem path.
 * @returns Whether the path is a directory.
 */
function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}
