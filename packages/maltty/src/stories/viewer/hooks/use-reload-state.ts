import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Reload state for the stories viewer.
 */
export interface ReloadState {
  readonly isReloading: boolean
  readonly onReloadStart: () => void
  readonly onReloadEnd: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_RELOAD_DISPLAY_MS = 300

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Track reload state with a minimum display duration. When a reload starts,
 * `isReloading` becomes `true` and stays `true` for at least
 * {@link MIN_RELOAD_DISPLAY_MS} ms even if the actual reload completes faster.
 *
 * @returns A {@link ReloadState} with callbacks and current state.
 */
export function useReloadState(): ReloadState {
  const [isReloading, setIsReloading] = useState(false)
  const reloadStartRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onReloadStart = useCallback((): void => {
    reloadStartRef.current = Date.now()
    setIsReloading(true)
  }, [])

  useEffect(() => {
    const ref = timerRef
    return (): void => {
      if (ref.current !== null) {
        clearTimeout(ref.current)
      }
    }
  }, [])

  const onReloadEnd = useCallback((): void => {
    const elapsed = Date.now() - reloadStartRef.current
    const remaining = MIN_RELOAD_DISPLAY_MS - elapsed

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }

    if (remaining <= 0) {
      setIsReloading(false)
      return
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setIsReloading(false)
    }, remaining)
  }, [])

  return { isReloading, onReloadStart, onReloadEnd }
}
