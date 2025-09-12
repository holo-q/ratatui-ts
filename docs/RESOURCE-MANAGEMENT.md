# Resource Management (free vs GC)

The bindings allocate native resources (Rust `ratatui_ffi` structs). Widgets and
`Terminal` wrap raw pointers; headless helpers build temporary arrays for a
single FFI call. This guide explains when you can rely on GC and when you
should free explicitly.

## TL;DR

- Short‑lived scripts: GC is fine; finalizers will free native objects on exit.
- Long‑running apps and hot loops: call `.free()` when done with a widget; always
  free `Terminal` in a `finally` block.
- Builders (`buildSpans/LineSpans/...`): no manual free needed; they keep inputs
  alive only until the FFI call returns.

## Finalizers vs explicit free

Every wrapper registers a `FinalizationRegistry` to call the matching
`*_free(handle)` when the object is GC’ed. This avoids leaks in short scripts.

Explicit `.free()` gives deterministic cleanup:
- Return memory to native side promptly
- Reduce heap pressure and GC jitter in hot loops
- Restore terminal state (`Terminal`) even if exceptions occur

Recommended pattern:

```ts
const term = Terminal.init();
try {
  const p = Paragraph.fromText('Hello');
  p.setBlockTitle('Demo', true);
  term.drawParagraph(p);
  p.free(); // good practice in long-running apps
} finally {
  term.free(); // always restore raw/alt/cursor
}
```

## Builders lifetime

`buildSpans`, `buildLineSpans`, `buildCellsLines`, `buildRowsCellsLines` return
contiguous arrays and keep CStrings/struct arrays alive only for the duration of
the FFI call you pass them into. After the call returns, you can drop the
result; no explicit free is required.

## Reuse vs dispose

- Prefer reusing widgets across frames (e.g., update data then redraw) when
  possible.
- If you allocate per frame (e.g., temporarily), `.free()` them before the next
  frame to minimize churn.

## Terminal state

`Terminal` toggles raw mode and possibly alternate screen. Always free it in a
`finally` block so cursor and screen state are restored even on errors.

## Diagnostics

- Set `RATATUI_FFI_LOG=/tmp/ratatui_ffi.log` to log native operations.
- Set `RATATUI_FFI_TRACE=1` to trace FFI calls (verbose; for debugging only).

These toggles help track down unexpected resource usage or terminal state.

