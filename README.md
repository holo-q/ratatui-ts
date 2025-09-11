# <img src="./logo.webp" alt="ratatui_ffi logo" width="36"/> ratatui-ts (TypeScript bindings)

High-quality TypeScript bindings for the `ratatui_ffi` C ABI, using `ffi-napi`.

- Safe, ergonomic wrappers for Terminal, Paragraph, List, Table, Gauge, Tabs, BarChart, Sparkline, Chart, events, and headless rendering
- Cross-platform dynamic loading of the compiled `ratatui_ffi` library
- Automatic resource cleanup via FinalizationRegistry, with explicit `free()` as well
- Strongly-typed enums and structs to mirror the FFI API
 - Optional Scrollbar support (if Rust is built with feature `scrollbar`)

## Install

1) Build the Rust cdylib first:

```
cargo build --release -p ratatui_ffi
```

This produces a platform-specific dynamic library in `ratatui-ffi/target/release/`:
- Linux: `libratatui_ffi.so`
- macOS: `libratatui_ffi.dylib`
- Windows: `ratatui_ffi.dll`

2) Install Node deps for the bindings package:

```
npm install
```

If your library is not in the default search location, set:
- `RATATUI_FFI_PATH` to the absolute path of the compiled library file

## Usage

```ts
import {
  Terminal, Paragraph, List, Table, Gauge, Tabs, BarChart, Sparkline, Chart,
  color, styleMods, key, eventKind, mouseKind, mouseButton, widgetKind, rect,
  headlessRender, headlessRenderFrame,
} from 'ratatui-ts';

// Terminal lifecycle
const term = Terminal.init();
try {
  // Draw a Paragraph full-screen
  const p = Paragraph.fromText('Hello from ratatui!');
  p.setBlockTitle('Demo', true);
  term.drawParagraph(p);

  // Poll events (500ms timeout)
const evt = Terminal.nextEvent(500);
if (evt && evt.kind === eventKind.Key) {
  if (evt.key.code === key.Enter) {
    console.log('Enter pressed');
  }
}
} finally {
  term.free(); // restore terminal state
}

// Headless rendering (for tests/CI)
const p2 = Paragraph.fromText('Boxed text');
// show borders and a title
p2.setBlockTitle('Box', true);
const out = headlessRender(20, 3, p2);
console.log(out);
```

## Platform loading

- By default the loader tries:
  - `RATATUI_FFI_PATH` (if set)
  - `../ratatui-ffi/target/release/<libname>` relative to this package
  - `../../ratatui-ffi/target/release/<libname>` as a fallback

You can also explicitly pass a path to `loadLibrary(path)`.

## Notes

- These bindings use the C ABI exported by `ratatui_ffi`. If you update the Rust side, ensure exported symbols remain stable.
- Most widgets are already wrapped. Need more? Extend following the existing pattern.
- If you use headless APIs that return strings, the wrapper frees returned C strings via the provided `ratatui_string_free` to avoid leaks.
- Scrollbar is feature-gated on the Rust side. If you enable it (`--features scrollbar`), the `Scrollbar` class becomes available and `widgetKind.Scrollbar` works in batched frames. Without it, the Scrollbar class throws on construction.

## TypeScript niceties

- Batch builders for spans/lines/rows to minimize FFI calls.
- Layout helpers (`layoutSplitEx2`, `layoutSplitPercentages`) and `FrameBuilder` for batched drawing.
- Headless helpers for full frames: text, styles_ex, and structured cells.
- Rich widget APIs (blockAdv, title alignment, batch setters) while staying 1:1 with FFI.
- Version and feature bits (`getVersion()`, `getFeatureBits()`), color helpers (`colorHelper.rgb/idx`).

See the full feature guide: `docs/TS-FEATURES.md`.

## Coverage check (bindings ↔ FFI)

- Generate introspection JSON from the Rust side:

```
cd ratatui-ffi && cargo run --quiet --bin ffi_introspect -- --json > /tmp/ffi.json
```

- Run the TS coverage checker (fails on missing bindings):

```
node scripts/check-introspection.js /tmp/ffi.json --features-map scripts/features-map.json
```

- Optional: gate by feature bits (requires `ffi-napi` installed in this repo and a compiled library path):

```
node scripts/check-introspection.js /tmp/ffi.json --lib ./ratatui-ffi/target/release/libratatui_ffi.so --features-map scripts/features-map.json
```

- Use `--allow path/to/allow.txt` to temporarily silence known gaps (one export name per line). The script exits non-zero on any missing or invalid declarations.

## API surface

- Classes
  - `Terminal`: `init()`, `clear()`, `size()`, per-widget `drawXxxIn()`, `free()`, static `nextEvent(timeout)` returns a typed union (`Event`).
  - `Paragraph`: `fromText()`, `setBlockTitle()`, `appendLine()`, `free()`.
  - `List`, `Table`, `Gauge`, `Tabs`, `BarChart`, `Sparkline`, `Chart`, `Scrollbar` (optional): predictable `set...` and `free()` methods + `handle` property for batching.
  - Batched: `makeDrawCmd(kind, handle, rect)`, `drawFrame(term, cmds)`.
- Headless helpers
  - `headlessRender(width, height, paragraph)`
  - `headlessRenderFrame(width, height, cmds)`
  - `headlessRenderXxx(...)` for most widgets
- Enums
  - Colors: `color.*`
  - Styles: `styleMods.*`
  - Keys: `key.*` (includes F1..F12 via numeric codes)
  - Events: `eventKind.*`; typed union `Event` for convenience
  - Mouse: `mouseKind.*`, `mouseButton.*`
  - Widgets: `widgetKind.*`

## ESM and CJS

- Dual build is provided. Use either:
  - ESM: `import { Terminal } from 'ratatui-ts'` (resolves to `dist/esm/index.js`)
  - CJS: `const { Terminal } = require('ratatui-ts')` (resolves to `dist/cjs/index.js`)

## BigInt-safe 64-bit values

- For `BarChart.setValues()` and `Sparkline.setValues()`, you may pass `bigint[]` or `number[]`.
- Values are marshalled as true unsigned 64-bit (little-endian) to avoid precision loss.

## Testing (headless)

- Snapshot-style tests can use headless helpers to render into strings without a TTY.
- Example (Vitest): see `test/paragraph.spec.ts`.
- Tests auto-skip if the native library is not found. Set `RATATUI_FFI_PATH` to enable execution on CI.

## Postinstall check

- `postinstall` will check for the native library in common locations and warn if not found. It does not build the Rust code for you.
- Build the Rust side separately, or ship prebuilt binaries for your target platforms.

## Packaging prebuilt libraries (optional)

- If you plan to publish to npm with prebuilt native libraries, consider:
  - Adding release assets from your CI (e.g., GitHub Actions) covering Linux/macOS/Windows and architectures.
  - A `postinstall` script that downloads the right asset if `RATATUI_FFI_PATH` is not set, with checksum verification.
  - Keep the dynamic library outside your JS bundle; point the loader to it via `RATATUI_FFI_PATH`.

## Node-API addon (optional)

- For maximum performance and fewer allocations, a Node-API (napi-rs) addon can wrap the same Rust logic.
- This repo focuses on C ABI + ffi-napi for portability and simplicity. If you want the addon path, we can scaffold a separate crate and `@ratatui/ts-napi` package.
