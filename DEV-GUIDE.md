# ratatui-ts Developer Guide

This guide explains how the TypeScript bindings map to `ratatui_ffi`, how to keep them fully in sync with the Rust FFI, how to validate coverage, and how to upgrade when a new `ratatui`/`ratatui_ffi` version lands.

## Overview

- Source layout
  - `ratatui-ffi/` — Rust crate exposing a flat C ABI for ratatui.
  - `ts/` — TypeScript bindings (ffi-napi) and package sources.
- Goals
  - 100% export coverage: every `ratatui_ffi` symbol is bound in TS.
  - Stable C ABI types and explicit ownership rules.
  - Automated validation via FFI introspection JSON and headless snapshot renders.

## Prerequisites

- Rust toolchain (stable) to build `ratatui-ffi` and run the introspector.
- Node.js 18+ and npm to build and validate the TS package.

## Building the native library

- Build the Rust cdylib:

  ```bash
  cd ratatui-ffi
  cargo build --release -p ratatui_ffi
  ```

- Output library names by platform
  - Linux: `libratatui_ffi.so`
  - macOS: `libratatui_ffi.dylib`
  - Windows: `ratatui_ffi.dll`

- The TS loader searches common locations and respects `RATATUI_FFI_PATH` to point to the absolute path of the compiled library. See `ts/scripts/postinstall.js` and `ts/src/native.ts`.

## Feature bits and capability detection

- `ratatui_ffi_feature_bits() -> u32` returns a bitmask enabling optional families of APIs:
  - SCROLLBAR, CANVAS, STYLE_DUMP_EX, BATCH_TABLE_ROWS, BATCH_LIST_ITEMS, COLOR_HELPERS, AXIS_LABELS
- The TS coverage checker can read these bits from a compiled library and gate required exports accordingly.

## Core type mappings (TS)

These structs mirror the C ABI in `ts/src/native.ts`:

- `FfiRect { u16 x, y, width, height }`
- `FfiStyle { u32 fg, bg; u16 mods }`
- `FfiSpan { const char* text_utf8; FfiStyle style }`
- `FfiLineSpans { const FfiSpan* spans; size_t len }`
- `FfiCellLines { const FfiLineSpans* lines; size_t len }`
- `FfiRowCellsLines { const FfiCellLines* cells; size_t len }`
- `FfiCellInfo { u32 ch, fg, bg; u16 mods }`

Enum-like integers used by APIs:
- Alignment: 0=Left,1=Center,2=Right
- Direction (layout): 0=Vertical,1=Horizontal
- Borders bitflags: LEFT=1, RIGHT=2, TOP=4, BOTTOM=8 (combine)
- BorderType: 0=Plain,1=Thick,2=Double

Color encoding helpers (bound):
- `ratatui_color_rgb(r,g,b)` -> `0x80000000 | r<<16 | g<<8 | b`
- `ratatui_color_indexed(idx)` -> `0x40000000 | idx`

## Memory ownership and strings

- Functions returning `char*` text allocate strings on the Rust side; free them with `ratatui_string_free` after copying/decoding.
- Handles from `*_new()` must be freed via `*_free()`.
- Headless buffers allocated by the caller (e.g., `FfiCellInfo[]`) are owned by the caller.

## Binding conventions (ffi-napi)

- All exports are bound in a single `ffi.Library` map in `ts/src/native.ts`.
- Pointers are declared with `ref.refType(...)`. `size_t` uses `ref.types.size_t`.
- Arrays passed to FFI use the `ref-array-di` helpers or Buffers pointing at typed memory; ensure lifetimes cover the call.

## Coverage checker (strict)

- Script: `ts/scripts/check-introspection.js`
- Features map: `ts/scripts/features-map.json`
- NPM scripts: see `ts/package.json`
  - `npm run check:introspect` — bare check (expects `/tmp/ffi.json`)
  - `npm run check:introspect:fm` — with features map

Steps:
1) Generate introspection JSON from the Rust side:

   ```bash
   cd ratatui-ffi
   cargo run --quiet --bin ffi_introspect -- --json > /tmp/ffi.json
   ```

2) Run the TS coverage checker (fails fast on any missing binding):

   ```bash
   cd ts
   npm run check:introspect:fm
   ```

3) Optional: gate by runtime feature bits (requires `ffi-napi` installed and a built library):

   ```bash
   node scripts/check-introspection.js /tmp/ffi.json \
     --lib ../ratatui-ffi/target/release/libratatui_ffi.so \
     --features-map scripts/features-map.json \
     --out coverage.json
   ```

- The checker validates:
  - Export parity: every FFI name is declared in `native.ts`.
  - Feature-aware gating using `features-map.json` and `ratatui_ffi_feature_bits()` if `--lib` is passed.
  - Arity sanity: counts declared argument positions to catch malformed entries.
  - Exits non-zero on any missing/invalid bindings.

## Snapshot testing (recommended)

Use the headless renderers to snapshot-render a representative layout:
- Text only: `ratatui_headless_render_frame(width,height, cmds[])`
- Styles (compact): `ratatui_headless_render_frame_styles`
- Styles (extended): `ratatui_headless_render_frame_styles_ex`
- Structured cells: `ratatui_headless_render_frame_cells(FfiCellInfo[])`

Suggested test scene:
- Layout split with per-side margins and spacing (`layout_split_ex2`).
- Paragraph/List/Table/Tabs/Gauge/Chart/Sparkline/Scrollbar/Canvas/Logo.
- Block titles and title alignment; per-span styled labels; datasets; axis labels.

Normalize EOLs and compare against goldens.

## Upgrade procedure (ratatui / ratatui_ffi)

Use this checklist when updating to a new `ratatui` or `ratatui_ffi` version.

1) Pull latest FFI
   ```bash
   cd ratatui-ffi
   git pull --ff-only origin master
   ```

2) Review changes
   - Skim `ratatui-ffi/UPGRADE_GUIDE.md` and `src/lib.rs` for breaking changes.
   - Note new exports, removed exports, and any struct layout changes.

3) Rebuild and introspect
   ```bash
   cargo build --release -p ratatui_ffi
   cargo run --quiet --bin ffi_introspect -- --json > /tmp/ffi.json
   ```

4) Update TS bindings
   - `ts/src/native.ts`: add/remove functions to match `exports_source`.
   - Update type structs if the ABI changed (`FfiStyle`, `FfiRect`, spans/lines arrays, etc.).
   - Extend `ts/scripts/features-map.json` for any new feature-gated export families.

5) Validate coverage
   ```bash
   cd ts
   npm run check:introspect:fm
   # Optional feature-gated check
   node scripts/check-introspection.js /tmp/ffi.json \
     --lib ../ratatui-ffi/target/release/libratatui_ffi.so \
     --features-map scripts/features-map.json
   ```

6) Run or add snapshot tests
   - Ensure representative snapshots still pass; update goldens if intended changes occurred.

7) Update docs
   - `ts/README.md` and this guide if public APIs or capabilities changed.

8) Release
   - If publishing to npm: consider bundling prebuilt binaries or provide a postinstall downloader.
   - Tag the version and publish after CI passes.

## CI suggestion

- Add a job that:
  - Builds `ratatui-ffi` for the CI host.
  - Generates `ffi_introspect` JSON.
  - Runs the TS coverage checker and the snapshot tests.

Pseudo workflow (Linux host):
```yaml
- name: Build ratatui_ffi
  run: |
    cd ratatui-ffi
    cargo build --release -p ratatui_ffi
- name: Generate introspection JSON
  run: |
    cd ratatui-ffi
    cargo run --quiet --bin ffi_introspect -- --json > $GITHUB_WORKSPACE/ffi.json
- name: Check TS bindings coverage
  run: |
    cd ts
    npm ci
    node scripts/check-introspection.js $GITHUB_WORKSPACE/ffi.json \
      --lib ../ratatui-ffi/target/release/libratatui_ffi.so \
      --features-map scripts/features-map.json
- name: Run tests
  run: |
    cd ts
    RATATUI_FFI_PATH=$GITHUB_WORKSPACE/ratatui-ffi/target/release/libratatui_ffi.so \
      npm test
```

## Troubleshooting

- Checker says Missing N but you added bindings
  - Ensure you edited `ts/src/native.ts` inside the `ffi.Library` map (not a dead code path).
  - Re-run `ffi_introspect` and re-run the checker with the correct JSON path.
- Feature-gated exports missing on your platform
  - Provide `--lib` to the checker so it reads runtime `feature_bits`. Update `features-map.json` if necessary.
- Loader can’t find the native library
  - Set `RATATUI_FFI_PATH` to the absolute path of the compiled library, or place it under `ts/native/` or `ts/prebuilt/<platform-arch>/`.

## Notes

- Scrollbar is feature-gated in Rust. If not compiled with the `scrollbar` feature, related APIs exist in the symbol list, but may not be active at runtime. Feature bits help you guard optional usage.
- Keep changes minimal and consistent with existing binding style. Prefer adding new APIs instead of changing existing ones unless the ABI changed upstream.

Happy hacking. Keep the coverage checker green.
