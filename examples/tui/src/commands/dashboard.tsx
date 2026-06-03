import {
  Box,
  screen,
  Select,
  Text,
  TextInput,
  useApp,
  useFullScreen,
  useInput,
} from '@maltty/core/ui'
import React, { useState } from 'react'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type View = 'menu' | 'tasks' | 'logs' | 'settings'

interface Task {
  readonly label: string
  readonly status: 'done' | 'in-progress' | 'todo'
}

interface LogEntry {
  readonly timestamp: string
  readonly level: 'info' | 'warn' | 'error'
  readonly message: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MENU_OPTIONS = [
  { label: 'Tasks', value: 'tasks' as const },
  { label: 'Logs', value: 'logs' as const },
  { label: 'Settings', value: 'settings' as const },
  { label: 'Quit', value: 'quit' as const },
]

const TASKS: readonly Task[] = [
  { label: 'Set up CI pipeline', status: 'done' },
  { label: 'Write integration tests', status: 'in-progress' },
  { label: 'Deploy to production', status: 'todo' },
  { label: 'Update documentation', status: 'todo' },
  { label: 'Configure monitoring', status: 'in-progress' },
]

const LOG_ENTRIES: readonly LogEntry[] = [
  { level: 'info', message: 'Server started on port 3000', timestamp: '10:01:12' },
  { level: 'info', message: 'Connected to database', timestamp: '10:01:13' },
  { level: 'warn', message: 'Deprecated API endpoint called: /v1/users', timestamp: '10:02:45' },
  { level: 'error', message: 'Failed to send email notification', timestamp: '10:03:01' },
  { level: 'info', message: 'Scheduled job completed: cleanup', timestamp: '10:05:00' },
  { level: 'warn', message: 'Memory usage above 80%', timestamp: '10:06:30' },
  { level: 'info', message: 'Cache invalidated for key: session_store', timestamp: '10:07:12' },
]

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/**
 * Renders a status badge for a task.
 */
function StatusBadge({ status }: { readonly status: Task['status'] }): React.ReactElement {
  return match(status)
    .with('done', () => <Text color="green">✔ done</Text>)
    .with('in-progress', () => <Text color="yellow">● in-progress</Text>)
    .with('todo', () => <Text color="gray">○ todo</Text>)
    .exhaustive()
}

/**
 * Renders a colored log level indicator.
 */
function LogLevel({ level }: { readonly level: LogEntry['level'] }): React.ReactElement {
  return match(level)
    .with('info', () => <Text color="blue">INFO </Text>)
    .with('warn', () => <Text color="yellow">WARN </Text>)
    .with('error', () => <Text color="red">ERROR</Text>)
    .exhaustive()
}

/**
 * Status bar showing keyboard hints and terminal dimensions at the bottom.
 */
function StatusBar({ view }: { readonly view: View }): React.ReactElement {
  const { columns, rows } = useFullScreen()
  const hint = match(view)
    .with('menu', () => 'arrows: navigate | enter: select')
    .with('tasks', () => 'arrows: navigate | enter: select | b: back')
    .with('logs', () => 'b: back')
    .with('settings', () => 'enter: save | b: back')
    .exhaustive()

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Text color="gray">{hint} | q: quit</Text>
      <Text color="gray">
        {columns}x{rows}
      </Text>
    </Box>
  )
}

/**
 * Main menu view with selectable options.
 */
function MenuView({
  onSelect,
}: {
  readonly onSelect: (value: string) => void
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Dashboard</Text>
      <Select options={MENU_OPTIONS} onSubmit={onSelect} />
    </Box>
  )
}

/**
 * Tasks view showing a list of tasks with statuses.
 */
function TasksView(): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const taskOptions = TASKS.map((task, index) => ({
    label: task.label,
    value: String(index),
  }))

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Tasks</Text>
      {match(selectedIndex)
        .with(null, () => (
          <Select
            options={taskOptions}
            onSubmit={(value) => {
              setSelectedIndex(Number(value))
            }}
          />
        ))
        .otherwise((idx) => {
          const task = TASKS[idx]
          if (!task) {
            return <Text color="red">Task not found</Text>
          }
          return (
            <Box flexDirection="column" gap={1}>
              <Box gap={1}>
                <Text bold>{task.label}</Text>
                <StatusBadge status={task.status} />
              </Box>
              <Text color="gray">Press b to go back to task list</Text>
            </Box>
          )
        })}
    </Box>
  )
}

/**
 * Logs view showing recent log entries.
 */
function LogsView(): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Logs</Text>
      <Box flexDirection="column">
        {LOG_ENTRIES.map((entry) => (
          <Box key={`${entry.timestamp}-${entry.message}`} gap={1}>
            <Text color="gray">{entry.timestamp}</Text>
            <LogLevel level={entry.level} />
            <Text>{entry.message}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

/**
 * Settings view with a text input for changing a value.
 */
function SettingsView(): React.ReactElement {
  const [apiUrl, setApiUrl] = useState('https://api.example.com')
  const [saved, setSaved] = useState(false)

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Settings</Text>
      <Box gap={1}>
        <Text>API URL:</Text>
        {match(saved)
          .with(true, () => <Text color="green">{apiUrl} (saved)</Text>)
          .with(false, () => (
            <TextInput
              defaultValue={apiUrl}
              onSubmit={(value) => {
                setApiUrl(value)
                setSaved(true)
              }}
            />
          ))
          .exhaustive()}
      </Box>
    </Box>
  )
}

/**
 * Root dashboard component that manages view navigation.
 */
function Dashboard(): React.ReactElement {
  const { exit } = useApp()
  const [view, setView] = useState<View>('menu')

  useInput((input, key) => {
    if (input === 'q') {
      exit()
      return
    }
    if (input === 'b' && view !== 'menu') {
      setView('menu')
    }
    if (key.escape && view !== 'menu') {
      setView('menu')
    }
  })

  const handleMenuSelect = (value: string): void => {
    match(value)
      .with('tasks', () => setView('tasks'))
      .with('logs', () => setView('logs'))
      .with('settings', () => setView('settings'))
      .with('quit', () => exit())
      .otherwise(() => {})
  }

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      {match(view)
        .with('menu', () => <MenuView onSelect={handleMenuSelect} />)
        .with('tasks', () => <TasksView />)
        .with('logs', () => <LogsView />)
        .with('settings', () => <SettingsView />)
        .exhaustive()}
      <StatusBar view={view} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Dashboard screen — a persistent interactive TUI with multiple views.
 */
export default screen({
  description: 'Launch an interactive dashboard with tasks, logs, and settings',
  fullscreen: true,
  render: Dashboard,
})
