# Function Standards

## Overview

Patterns for writing functions in TypeScript. This standard covers parameter design, documentation, purity, and composition. Well-structured functions are the primary unit of abstraction in this codebase and should be small, focused, and composable.

## Rules

### Use Object Parameters

Use an object parameter when a function has 2 or more related parameters, especially when those parameters are primitives where the meaning is unclear at the call site.

| Scenario                            | Use Object? | Why                         |
| ----------------------------------- | ----------- | --------------------------- |
| 2+ related params                   | Yes         | Named params are clearer    |
| Primitive params (`string, string`) | Yes         | Prevents argument confusion |
| Single param                        | No          | Unnecessary overhead        |
| Single complex object               | No          | Already clear               |

Define an interface with a `Params`, `Options`, or `Args` suffix, then destructure in the function signature.

| Suffix     | Use Case                         |
| ---------- | -------------------------------- |
| `*Params`  | Required input parameters        |
| `*Options` | Optional configuration           |
| `*Args`    | Function arguments (less common) |

#### Correct

```ts
interface RunScriptParams {
  name: string
  workspace: string
  dryRun: boolean
}

export function runScript({ name, workspace, dryRun }: RunScriptParams): RunResult {
  // ...
}

// Usage is self-documenting
runScript({ name: 'build', workspace: 'packages/maltty', dryRun: false })
```

```ts
interface ResolvePathParams {
  root: string
  workspace: string
}

interface ResolvePathOptions {
  absolute?: boolean
  followSymlinks?: boolean
}

function resolvePath({ root, workspace }: ResolvePathParams, options?: ResolvePathOptions): string {
  // ...
}
```

#### Incorrect

```ts
// What's the difference between these strings?
function runScript(name: string, workspace: string, dryRun: boolean): RunResult {
  // ...
}

// Easy to swap by mistake
runScript('packages/maltty', 'build', false)
```

### Document All Functions with JSDoc

Every function requires a JSDoc comment — both exported and non-exported. Document the "why" more than the "what". For object parameters, document the object as a whole rather than listing every property.

**Exported functions** get a full JSDoc block with `@param` and `@returns` tags.

**Non-exported (private) functions** get a JSDoc block with the `@private` tag. Keep the description concise — one line is enough for simple helpers.

Test files are exempt from this rule.

#### Correct

```ts
/**
 * Resolves a script definition from the workspace config.
 *
 * @param params - Script name and workspace path to search.
 * @returns The resolved script or a config error.
 */
export function resolveScript({
  name,
  workspace,
}: ResolveScriptParams): Result<Script, ConfigError> {
  // ...
}

/**
 * Normalize a script name to lowercase kebab-case.
 *
 * @private
 * @param name - Raw script name from the config file.
 * @returns The normalized name.
 */
function normalizeName(name: string): string {
  return kebabCase(name)
}
```

#### Incorrect

```ts
// Missing JSDoc entirely
export function resolveScript(params: ResolveScriptParams) {}

// Missing @private on non-exported function
function normalizeName(name: string): string {
  return kebabCase(name)
}

// Listing every property in JSDoc
/**
 * @param params.name - The script name
 * @param params.workspace - The workspace path
 */
export function resolveScript(params: ResolveScriptParams) {}
```

### Prefer Pure Functions

Prefer pure functions that have no side effects and return predictable outputs. Same inputs must always produce same outputs, with no modification of external state and no I/O operations.

#### Correct

```ts
// Pure function - no side effects
function buildScriptCommand(script: Script, args: readonly string[]): string {
  return [script.command, ...args].join(' ')
}
```

```ts
// Pure business logic separated from side effects
function validateConfig(config: LaufConfig): ValidationResult {
  // ...
}

// Side effects isolated in handler
async function handleInit(config: LaufConfig) {
  const validation = validateConfig(config) // Pure

  if (!validation.ok) {
    logger.warn({ validation }, 'Invalid config') // Side effect at edge
    return
  }

  await writeConfig(config) // Side effect at edge
}
```

#### Incorrect

```ts
// Side effects mixed into business logic
function buildScriptCommand(script: Script, args: readonly string[]): string {
  console.log('Building command...') // Side effect
  const cmd = [script.command, ...args].join(' ')
  analytics.track('command_built') // Side effect
  return cmd
}
```

### Compose Small Functions

Prefer small, focused functions that can be composed together. Use early returns to flatten control flow instead of nesting.

#### Correct

```ts
// Small, focused functions
const normalize = (s: string) => s.trim().toLowerCase()
const validate = (s: string) => s.length > 0
const format = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Composed together
function processName(input: string): string | null {
  const normalized = normalize(input)
  if (!validate(normalized)) return null
  return format(normalized)
}
```

```ts
// Early returns to avoid deep nesting
function process(data: Data) {
  if (data.type !== 'script') return
  if (data.status !== 'active') return
  if (data.items.length === 0) return

  // Main logic here
}
```

#### Incorrect

```ts
// Deeply nested conditionals
function process(data: Data) {
  if (data.type === 'script') {
    if (data.status === 'active') {
      if (data.items.length > 0) {
        // ...
      }
    }
  }
}
```

## References

- [Naming Conventions](./naming.md) -- Parameter interface naming
- [Design Patterns](./design-patterns.md) -- Factories, pipelines, composition
