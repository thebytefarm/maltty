# TUI Interaction Decisions

## Status

Accepted for the first pointer interaction feature. Focus, hover, drag, and selection remain deferred.

Pointer interaction is opt-in. Applications call `renderInteractive()` instead of Ink's `render()` and use
`Pressable` for clickable layout boxes. A `Pressable` rendered by ordinary Ink remains visually identical
to `Box`, and its `onClick` handler is inert.

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

The public interaction surface therefore requires a known origin:

- `renderInteractive()` uses Ink's alternate screen and origin `{ x: 0, y: 0 }` by default;
- applications that disable the alternate screen must supply their live region's viewport `origin`;
- keyboard behavior remains available in every layout.

Automatic inline origin discovery through cursor-position reports (`CSI 6 n`) is deferred. It would
compete for stdin ownership and terminal responses, so it will ship only after a separate proof shows
reliable behavior across supported terminals.

## Hit-grid frames

Interaction lookup uses an invisible terminal-cell ownership grid paired with the rendered frame. Target
rectangles use inclusive top/left and exclusive bottom/right edges. They are painted into the grid in the
same order as Ink paints the corresponding host nodes, so later nodes overwrite earlier ownership. Disabled
targets paint nothing. Every active ancestor clip must also contain a cell before the target can own it.

The next grid is built as a complete immutable value and atomically committed only from Ink's `onRender`
callback. Input reads the last committed grid and never observes a partially rebuilt target list. Resize and
layout changes replace the complete grid dimensions and ownership together.

Ink invokes `onRender` after Yoga layout and output generation but before React attaches refs for newly
mounted nodes. A target registration must therefore request one immediate follow-up frame from a layout
effect after its ref attaches. The first frame remains non-interactive; the follow-up frame publishes the
target before the JavaScript event loop can process terminal input. A component-only hook cannot provide
this guarantee because it does not control Ink's render callback.

`renderInteractive()` owns target registration and composes Ink's `onRender` option. Reconstructing
ownership from ANSI output or asynchronously cached measurements is explicitly rejected.

## Usage

```tsx
import { Pressable, renderInteractive, Text } from '@maltty/tui'

const app = renderInteractive({
  node: (
    <Pressable onClick={({ localX, localY }) => handleClick({ localX, localY })}>
      <Text>Launch</Text>
    </Pressable>
  ),
})

await app.waitUntilExit()
```

Clicks fire only when pointer down and pointer up resolve to the same enabled `Pressable`. This prevents a
press on one target followed by a release elsewhere from activating either target.

## Influences

- [OpenTUI](https://github.com/anomalyco/opentui) maintains current and next cell-ownership grids, applies
  renderer paint order and clipping, and swaps grids only after a successful frame. This is the primary
  model for frame publication and constant-time lookup.
- [Textual](https://github.com/Textualize/textual) stores render-derived geometry, effective clips, and paint
  order together in its compositor. This informs semantic target rectangles when renderer-level glyph
  ownership is unavailable.
- Blessed-style cached bounds and existing Ink mouse hooks were rejected because effect- or time-based
  measurement can drift from the visible frame and does not reliably model clipping or overlap.

## Manual verification

Run `pnpm --filter=@examples/tui interaction` from the repository root in a real terminal. The playground
enters the alternate screen and enables SGR mouse reporting while it is active.

- Click each card and confirm only the card under the pointer changes to `CLICKED`.
- Modifier-click a card and confirm the event details update.
- Resize the terminal, then click the moved cards to confirm the hit grid follows the rendered frame.
- Press `q` or Escape and confirm the original screen, cursor, and normal terminal mouse behavior return.
