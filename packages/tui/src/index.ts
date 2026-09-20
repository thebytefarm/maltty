// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export {
  Box,
  kittyFlags,
  kittyModifiers,
  measureElement,
  Newline,
  Spacer,
  Static,
  Text,
  Transform,
  useApp,
  useCursor,
  useFocus,
  useFocusManager,
  useInput,
  useIsScreenReaderEnabled,
  useStderr,
  useStdin,
  useStdout,
} from 'ink'
export type {
  AppProps,
  BoxProps,
  CursorPosition,
  DOMElement,
  Key,
  KittyFlagName,
  KittyKeyboardOptions,
  NewlineProps,
  StaticProps,
  StderrProps,
  StdinProps,
  StdoutProps,
  TextProps,
  TransformProps,
} from 'ink'

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export {
  Autocomplete,
  Confirm,
  GroupMultiSelect,
  MultiSelect,
  PasswordInput,
  PathInput,
  Select,
  SelectKey,
  TextInput,
} from './prompts/index.js'
export type {
  AutocompleteProps,
  ConfirmProps,
  GroupMultiSelectProps,
  MultiSelectProps,
  PasswordInputProps,
  PathInputProps,
  PromptOption,
  PromptProps,
  SelectKeyProps,
  SelectProps,
  TextInputProps,
} from './prompts/index.js'

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export { Alert, ErrorMessage, ProgressBar, Spinner, StatusMessage } from './display/index.js'
export type {
  AlertProps,
  AlertVariant,
  ErrorMessageProps,
  ProgressBarProps,
  ProgressBarStyle,
  SpinnerProps,
  StatusMessageProps,
  StatusMessageVariant,
} from './display/index.js'

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export {
  FullScreen,
  ScrollArea,
  Tabs,
  useFullScreen,
  useSize,
  useTerminalSize,
} from './layout/index.js'
export type {
  FullScreenProps,
  FullScreenState,
  ScrollAreaProps,
  Size,
  TabItem,
  TabsProps,
  TerminalSize,
} from './layout/index.js'

// ---------------------------------------------------------------------------
// Theme and input
// ---------------------------------------------------------------------------

export { colors, resolveVariantColor, symbols } from './theme.js'
export type { ThemeColor, Variant } from './theme.js'

export { matchesSequence, matchesSingleKey, normalizeKey, parseKeyPattern } from './keys.js'
export type {
  NormalizedKeyEvent,
  ParsedKeyPattern,
  SequenceKeyPattern,
  SingleKeyPattern,
} from './keys.js'

export { useHotkey } from './use-key-binding.js'
export type { UseHotkeyArgs } from './use-key-binding.js'
