import { Box, Text, useApp, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import type { InteractionClickEvent } from '../../../packages/tui/src/interaction/index.js'
import { Pressable, renderInteractive } from '../../../packages/tui/src/interaction/index.js'
import type { SgrMouseEvent } from '../../../packages/tui/src/interaction/sgr-mouse.js'
import { useTerminalSize } from '../../../packages/tui/src/layout/fullscreen.js'

type TargetId = 'alpha' | 'beta' | 'gamma'

interface DemoEvent {
  readonly event: SgrMouseEvent
  readonly targetId: TargetId | null
}

interface TargetCardProps {
  readonly active: boolean
  readonly id: TargetId
  readonly label: string
  readonly onClick: (params: TargetCardClickParams) => void
}

interface TargetCardClickParams {
  readonly event: InteractionClickEvent
  readonly targetId: TargetId
}

function TargetCard({ active, id, label, onClick }: TargetCardProps): ReactElement {
  const color = match(active)
    .with(true, () => 'green')
    .with(false, () => 'cyan')
    .exhaustive()
  const status = match(active)
    .with(true, () => 'CLICKED')
    .with(false, () => 'click me')
    .exhaustive()

  return (
    <Pressable
      borderColor={color}
      borderStyle="round"
      flexDirection="column"
      onClick={(event) => onClick({ event, targetId: id })}
      paddingX={2}
      width={20}
    >
      <Text bold color={color}>
        {label}
      </Text>
      <Text dimColor>target: {id}</Text>
      <Text>{status}</Text>
    </Pressable>
  )
}

function formatEvent(lastEvent: DemoEvent | null): string {
  return match(lastEvent)
    .with(null, () => 'Waiting for a click or wheel event...')
    .otherwise(({ event, targetId }) => {
      const modifiers = Object.entries(event.modifiers)
        .filter(([, enabled]) => enabled)
        .map(([modifier]) => modifier)
      const modifierText = match(modifiers)
        .with([], () => 'none')
        .otherwise((values) => values.join('+'))
      return `${event.type} ${event.button} at (${event.x}, ${event.y}) | target: ${targetId ?? 'none'} | modifiers: ${modifierText}`
    })
}

function InteractionDemo(): ReactElement {
  const { exit } = useApp()
  const { columns, rows } = useTerminalSize()
  const [lastEvent, setLastEvent] = useState<DemoEvent | null>(null)

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit()
      return
    }
  })

  const activeId = lastEvent?.targetId ?? null
  const handleClick = ({ event, targetId }: TargetCardClickParams): void => {
    setLastEvent({
      event: {
        button: event.button,
        modifiers: event.modifiers,
        type: 'up',
        x: event.viewportX,
        y: event.viewportY,
      },
      targetId,
    })
  }

  return (
    <Box flexDirection="column" height={rows} paddingX={2} paddingY={1} width={columns}>
      <Text bold color="magentaBright">
        Maltty Interaction Hit-Grid
      </Text>
      <Text dimColor>Click targets and resize the terminal.</Text>

      <Box gap={2} marginTop={1}>
        <TargetCard
          active={activeId === 'alpha'}
          id="alpha"
          label="Navigation"
          onClick={handleClick}
        />
        <TargetCard active={activeId === 'beta'} id="beta" label="Weapons" onClick={handleClick} />
        <TargetCard
          active={activeId === 'gamma'}
          id="gamma"
          label="Engines"
          onClick={handleClick}
        />
      </Box>

      <Box borderColor="gray" borderStyle="single" marginTop={1} paddingX={1}>
        <Text>{formatEvent(lastEvent)}</Text>
      </Box>

      <Box flexGrow={1} />
      <Text dimColor>
        terminal: {columns}x{rows} | q or Escape: quit
      </Text>
    </Box>
  )
}

const app = renderInteractive({
  node: <InteractionDemo />,
  options: {
    exitOnCtrlC: true,
    patchConsole: false,
  },
})

await app.waitUntilExit()
