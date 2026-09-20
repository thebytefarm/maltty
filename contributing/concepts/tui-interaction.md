# TUI Interaction Decisions

## Status

Accepted for the interaction spike. Public component APIs remain deferred until the provider and focus
model are implemented.

## Input ownership

Ink remains the sole owner of stdin and raw mode. Pointer handling uses `useInput()` rather than adding
another `stdin` listener or calling `setRawMode()` directly. Ink 7 buffers fragmented CSI sequences and
passes SGR mouse input through as one value, but removes the leading escape byte before invoking the
handler. Maltty's parser accepts both forms and the equivalent 8-bit CSI form.

The first mouse modes are button press/release (`?1000`) and SGR coordinates (`?1006`). Drag (`?1002`)
and all-motion (`?1003`) remain disabled until mounted components explicitly request them. Enable and
disable sequences are symmetric, and signal/exit cleanup disables SGR mode before button reporting.
Terminal features share one process cleanup coordinator so fullscreen and mouse restoration complete before
the process exits with the termination signal's conventional status.

## Coordinates

SGR events use one-based viewport coordinates. Maltty normalizes them to zero-based coordinates before
hit testing.

Ink's `measureElement()` returns zero-based coordinates relative to the live layout region, including
ancestor offsets. It does not return viewport coordinates. Full-screen applications have a trustworthy
origin only when the interactive live region starts at viewport `{ x: 0, y: 0 }`; static output above the
live region invalidates that assumption even in the alternate screen buffer.

The public interaction surface will therefore require a known origin:

- a full-screen surface supplies `{ x: 0, y: 0 }` and must not place `<Static>` output above it;
- embedded and inline surfaces must receive an explicit viewport origin;
- pointer behavior stays disabled when an origin is unknown;
- keyboard behavior remains available in every layout.

Automatic inline origin discovery through cursor-position reports (`CSI 6 n`) is deferred. It would
compete for stdin ownership and terminal responses, so it will ship only after a separate proof shows
reliable behavior across supported terminals.

## Overlap model

Hit testing uses measured rectangles with inclusive top/left and exclusive bottom/right edges. Disabled
targets are ignored. Higher interaction priority wins; equal priorities resolve to the latest registered
target. Arbitrary visual stacking and clipping are not promised until nested interaction surfaces define
those semantics.
