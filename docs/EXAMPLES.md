# Examples

Run these from the repository root (ensure the native library is built and discoverable).

Prereqs
- Build native: `cd ratatui-ffi && cargo build --release -p ratatui_ffi && cd ..`
- Build JS: `npm install && npm run build`
- Set library path: `export RATATUI_FFI_PATH=$(pwd)/ratatui-ffi/target/release/libratatui_ffi.so`

Examples
- Full scene (layout + chart + canvas): `node examples/full-scene.ts` (via ts-node) or port to JS
- Batch widgets (paragraph/list/tabs/table/chart/bar/spark): `node examples/batch-widgets.ts`
- Minimal terminal loop: `node examples/terminal-loop.ts`

Snapshots generation (ASCII)
- `node scripts/gen-snapshots.js` → writes `docs/assets/snapshots/*.txt`

PNG conversion (CI)
- The `snapshots` workflow uses ImageMagick to convert `.txt` to `.png` with a monospaced font and uploads artifacts.

Note: In local environments using Node 20+ is recommended for maximum compatibility with native dependencies.
