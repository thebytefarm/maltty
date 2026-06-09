export { runTestCli, setArgv } from './cli.js'
export { createWritableCapture } from './capture.js'
export type { WritableCapture } from './capture.js'
export { runCommand, stripAnsi } from './command.js'
export {
  createTestContext,
  mockLog,
  mockPrompts,
  mockSpinner,
  mockStatus,
  mockStreamLog,
} from './context.js'
export { runHandler } from './handler.js'
export { setupTestLifecycle } from './lifecycle.js'
export { runMiddleware } from './middleware.js'
export { normalizeError } from './normalize-error.js'
export type {
  CommandResult,
  HandlerResult,
  MiddlewareResult,
  PromptResponses,
  RunCommandOptions,
  RunHandlerOptions,
  RunMiddlewareOptions,
  TestContextOptions,
  TestContextResult,
  TestLifecycle,
} from './types.js'
