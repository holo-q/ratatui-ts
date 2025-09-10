# Publishing ratatui-ts to npm

This package bundles TypeScript bindings and selects a matching native `ratatui_ffi` dynamic library at install-time.

Paths the loader checks (in order):
- `RATATUI_FFI_PATH` (absolute path to the compiled dynamic library)
- `native/<libname>` inside the installed package (populated by postinstall)
- `prebuilt/<platform-arch>/<libname>` inside the package (if you ship prebuilt artifacts)
- In-repo build outputs: `../../ratatui-ffi/target/{release,debug}` (useful in a mono-repo during development)

Where `<libname>` is one of:
- Linux: `libratatui_ffi.so`
- macOS: `libratatui_ffi.dylib`
- Windows: `ratatui_ffi.dll`

## Strategy options

1) Prebuilt binaries (recommended for end-users)
- Build `ratatui_ffi` in CI for each target (linux-x64, linux-arm64, win32-x64, darwin-x64, darwin-arm64).
- Place the outputs under `prebuilt/<platform-arch>/<libname>` before publishing.
- On install, the `postinstall` script copies the correct file to `native/`, which the loader prefers.

2) Build locally (requires Rust toolchain)
- Developers can export `RATATUI_FFI_PATH` or keep the repo layout and run `cargo build --release -p ratatui_ffi`.
- The `postinstall` script will find the local build and copy it to `native/`.

3) Custom path via env
- Set `RATATUI_FFI_PATH` to point to a custom build (e.g. nightly features).

## CI suggestions

- Build matrix for prebuilt artifacts:
  - ubuntu-latest: x64, aarch64 (cross)
  - macos-latest: x64, arm64
  - windows-latest: x64
- Strip symbols for smaller artifacts when appropriate.
- Upload artifacts named `<platform>-<arch>/<libname>` and place them under `prebuilt/` during release.

## NPM packaging details

- `files` whitelist includes `dist`, `scripts`, `native`, `prebuilt`, `README.md`.
- `postinstall` runs after install to select/copy the right native library into `native/`.
- Dual ESM/CJS builds are provided via `tsup`. Consumers can `import` or `require` as needed.

## Feature flags

- Scrollbar support is gated behind the Rust feature `scrollbar`. If you ship prebuilt libraries with this feature, the TypeScript `Scrollbar` class becomes available automatically; otherwise it throws on construction.
