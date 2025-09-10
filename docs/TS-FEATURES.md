# TypeScript Bindings: Idiomatic Features

This doc collects the unique ergonomics and patterns we provide on top of the flat `ratatui_ffi` C ABI, while staying zero‑cost in the hot path.

## Design goals

- Zero surprise: wrappers map 1:1 to FFI; helpers are opt‑in.
- Minimize FFI calls: batch data into contiguous arrays; draw in frames.
- Transparent ownership: explicit `free()` with FinalizationRegistry backup.
- Deterministic testing: headless text/styles_ex/cells.

## Batching and Builders

- FrameBuilder
  - `new FrameBuilder().add(kind, handle, rect) ... .toArray()` → pass to `drawFrame()` or `headlessRenderFrame()`.
- Spans/Lines/Table builders (FFI‑safe)
  - `buildSpans([{text,style}, ...])`
  - `buildLineSpans([span[], span[], ...])`
  - `buildCellsLines([ line[], line[], ... ])` (for a single row with multi‑line cells)
  - `buildRowsCellsLines([ row[], row[], ... ])` (batch multiple rows)
  - These return contiguous array buffers and keepAlive refs for safe call lifetimes.

## Layout helpers

- `layoutSplitEx2(width, height, dir, constraints, spacing, ml, mt, mr, mb)`
- `layoutSplitPercentages(width, height, dir, [pcts], spacing, ml, mt, mr, mb)`
- Use with `direction.Vertical | direction.Horizontal`.

## Headless utilities (testing)

- Per widget: `headlessRenderXxx(w,h, widget)`
- Full frame:
  - `headlessRenderFrame(w,h, cmds)` → text
  - `headlessRenderFrameStylesEx(w,h,cmds)` → extended styles dump string
  - `headlessRenderFrameCells(w,h,cmds)` → `{ch,fg,bg,mods}[]`

## Version and feature bits

- `getVersion(): {major,minor,patch}`
- `getFeatureBits(): number` → gate optional families (SCROLLBAR, CANVAS, STYLE_DUMP_EX, batching flags, COLOR_HELPERS, AXIS_LABELS).

## Color helpers

- `colorHelper.rgb(r,g,b)` and `colorHelper.idx(i)` return FFI bit‑coded color values.
- Constants: `color.*`, `styleMods.*` map to ratatui enums.

## Widget niceties

- Paragraph
  - `fromText`, `appendLine`, `appendSpan`, `appendSpans`, `appendLinesSpans`, `lineBreak`
  - `setBlockTitle`, `setBlockTitleAlignment`, `setBlockAdv`, `setAlignment`, `setWrap`, `setScroll`, `setStyle`, `reserveLines`
- List
  - `appendItem`, `appendItemSpans`, `appendItemsSpans`, `reserveItems`
  - `setBlockTitle`, `setBlockTitleAlignment`, `setBlockAdv`, `setDirection`, `setScrollOffset`, highlighting setters
- Table
  - `setHeaders`, `setHeadersSpans`
  - `appendRow`, `appendRowSpans`, `appendRowCellsLines`, `appendRowsCellsLines`
  - `setWidthsPercentages`, `setWidths`, `reserveRows`, styles + spacing setters
- Tabs
  - `setTitles`, `clearTitles`, `addTitleSpans`, `setTitlesSpans`, `setStyles`, `setDivider`, `setBlockAdv`
- Gauge / LineGauge
  - Full blockAdv/title alignment; Gauge styles triple setter
- BarChart / Sparkline
  - BigInt‑safe values; width/gap; styles; blockAdv/title alignment
- Chart
  - `addDatasetWithType`, `addDatasets(specs)`; label spans; axis styles; legend; bounds; reserve
- Canvas
  - Bounds/background/marker; addLine/addRect/addPoints; blockAdv/title alignment

## Stateful rendering

- `ListState` and `TableState` wrappers (`select`, `setOffset`)
- `drawListStateIn(term, list, rect, state)` and `drawTableStateIn(...)`

## Events

- Discriminated union for events with `Terminal.nextEvent(timeout)`.
- Optional async iterator can be built on top if needed.

## Ownership and performance

- Every wrapper registers a FinalizationRegistry cleanup; explicit `.free()` is provided and recommended in hot paths.
- Builders allocate exactly one contiguous array per call.
- Headless and layout helpers avoid extra copies; strings are UTF‑8 encoded once per call.

## Examples

- `ts/examples/full-scene.ts` — FrameBuilder + layout + headless text/styles/cells.
- `ts/examples/batch-widgets.ts` — Batch paragraph/list/tabs/table/chart/bar/sparkline.

## Tips

- Prefer batching (appendItemsSpans/appendRowsCellsLines) over many single calls for large datasets.
- Call `.free()` explicitly in loops or long‑running processes.
- Use `getFeatureBits()` to gate Scrollbar/Canvas/STYLE_DUMP_EX if shipping to varied environments.

