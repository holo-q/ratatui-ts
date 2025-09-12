#!/usr/bin/env bash
set -euo pipefail

# One-shot local demo runner.
# Attempts to:
#  1) build ratatui-ffi (release) if missing
#  2) run demo via tsx (source) if available; else build JS and run node dist

ROOT=$(cd "$(dirname "$0")/.." && pwd)
LIBNAME="libratatui_ffi.so"
case "$(uname -s)" in
  Darwin) LIBNAME="libratatui_ffi.dylib";;
  MINGW*|MSYS*|CYGWIN*) LIBNAME="ratatui_ffi.dll";;
esac

if [ ! -f "$ROOT/ratatui-ffi/target/release/$LIBNAME" ]; then
  echo "[demo] Building native ratatui_ffi (release)..."
  (cd "$ROOT/ratatui-ffi" && cargo build --release -p ratatui_ffi)
fi

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)

if [ ${NODE_MAJOR:-0} -ge 24 ]; then
  echo "[demo] Detected Node ${NODE_MAJOR}. ffi-napi is not compatible with Node 24+ yet."
  if command -v docker >/dev/null 2>&1; then
    echo "[demo] Running inside Docker with Node 20..."
    exec docker run --rm -it \
      -v "$ROOT":"$ROOT" -w "$ROOT" \
      -e RATATUI_FFI_PATH="$ROOT/ratatui-ffi/target/release/$LIBNAME" \
      node:20-bullseye bash -lc "npm ci && npm run build && node dist/cjs/bin/demo.js"
  else
    echo "[demo] Docker not available. Bootstrapping portable Node 20..."
    PLATFORM=$(uname -s)
    ARCH=$(uname -m)
    NODE_DIR="$ROOT/.node20"
    mkdir -p "$NODE_DIR"
    if [ ! -x "$NODE_DIR/bin/node" ]; then
      if [ "$PLATFORM" = "Linux" ]; then
        URL="https://nodejs.org/download/release/v20.16.0/node-v20.16.0-linux-x64.tar.xz"
        TAR="node-v20.16.0-linux-x64.tar.xz"
        echo "[demo] Downloading Node 20 (Linux x64)..."
        curl -fsSL "$URL" -o "$NODE_DIR/$TAR"
        tar -xJf "$NODE_DIR/$TAR" -C "$NODE_DIR"
        mv "$NODE_DIR/node-v20.16.0-linux-x64" "$NODE_DIR/node"
        rm -f "$NODE_DIR/$TAR"
      elif [ "$PLATFORM" = "Darwin" ]; then
        URL="https://nodejs.org/download/release/v20.16.0/node-v20.16.0-darwin-x64.tar.xz"
        TAR="node-v20.16.0-darwin-x64.tar.xz"
        echo "[demo] Downloading Node 20 (macOS x64)..."
        curl -fsSL "$URL" -o "$NODE_DIR/$TAR"
        tar -xJf "$NODE_DIR/$TAR" -C "$NODE_DIR"
        mv "$NODE_DIR/node-v20.16.0-darwin-x64" "$NODE_DIR/node"
        rm -f "$NODE_DIR/$TAR"
      else
        echo "[demo] Unsupported platform $PLATFORM. Please use Node 20 manually."
        exit 1
      fi
    fi
    export PATH="$NODE_DIR/node/bin:$PATH"
    echo "[demo] Using Node version: $(node -v)"
    npm ci
    npm run build
    exec node "$ROOT/dist/cjs/bin/demo.js"
  fi
fi

if [ ! -d "$ROOT/node_modules" ]; then
  echo "[demo] Installing dependencies..."
  npm install
fi

if command -v npx >/dev/null 2>&1; then
  echo "[demo] Trying tsx (source)..."
  if npx -y tsx "$ROOT/src/bin/demo.ts"; then
    exit 0
  else
    echo "[demo] tsx run failed; falling back to compiled demo..."
  fi
fi

echo "[demo] tsx not available; building JS and running compiled demo..."
if ! command -v tsup >/dev/null 2>&1; then
  npm install
fi
npm run build
exec node "$ROOT/dist/cjs/bin/demo.js"
