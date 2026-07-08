import { Box, screen, Spinner, Text, useApp } from 'maltty/ui'
import React, { useEffect, useState } from 'react'
import { match } from 'ts-pattern'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepState {
  readonly name: string
  readonly status: 'pending' | 'active' | 'done'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_NAMES = ['Linting', 'Testing', 'Building', 'Deploying'] as const

const STEP_DELAY_MS = 1000

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/**
 * Renders a single deploy step with a status indicator.
 */
function StepRow({ step }: { readonly step: StepState }): React.ReactElement {
  return match(step.status)
    .with('done', () => (
      <Box gap={1}>
        <Text color="green">✔</Text>
        <Text>{step.name}</Text>
      </Box>
    ))
    .with('active', () => (
      <Box gap={1}>
        <Spinner label={step.name} />
      </Box>
    ))
    .with('pending', () => (
      <Box gap={1}>
        <Text color="gray">○</Text>
        <Text color="gray">{step.name}</Text>
      </Box>
    ))
    .exhaustive()
}

/**
 * Deploy pipeline component that progresses through steps and exits on completion.
 */
function DeployPipeline({ target }: { readonly target: string }): React.ReactElement {
  const { exit } = useApp()
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (currentStep >= STEP_NAMES.length) {
      exit()
      return
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
    }, STEP_DELAY_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [currentStep, exit])

  const steps: readonly StepState[] = STEP_NAMES.map((name, index) =>
    match(true)
      .when(
        () => index < currentStep,
        () => ({ name, status: 'done' as const })
      )
      .when(
        () => index === currentStep,
        () => ({ name, status: 'active' as const })
      )
      .otherwise(() => ({ name, status: 'pending' as const }))
  )

  const allDone = currentStep >= STEP_NAMES.length

  return (
    <Box flexDirection="column" gap={1} padding={1}>
      <Text bold>Deploy to {target}</Text>
      <Box flexDirection="column">
        {steps.map((step) => (
          <StepRow key={step.name} step={step} />
        ))}
      </Box>
      {allDone && (
        <Box marginTop={1}>
          <Text color="green" bold>
            Deployed successfully to {target}!
          </Text>
        </Box>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Deploy screen — a temporary TUI that runs a build/deploy pipeline and exits.
 */
export default screen({
  description: 'Run the deploy pipeline with a live progress view',
  options: z.object({
    target: z.string().default('staging').describe('Deployment target environment'),
  }),
  render: DeployPipeline,
})
