---
'maltty': patch
---

Fix `screen()` commands silently swallowing errors thrown in async `useEffect` callbacks. Ink resolves `waitUntilExit()` on unmount even when a fire-and-forget async effect rejects, so the error never reached the runtime's error channel — and in fullscreen mode the global crash handler printed into the alternate buffer that was then cleared on exit, leaving no trace. The screen runtime now takes ownership of async error handling while mounted: it suspends the global crash handlers, races an internal guard against `waitUntilExit()` to capture the first `unhandledRejection`/`uncaughtException`, leaves the alternate screen buffer, and rejects so the error surfaces through the normal channel (visible message, exit code 1).
