#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function libName() {
  if (process.platform === 'win32') return 'ratatui_ffi.dll';
  if (process.platform === 'darwin') return 'libratatui_ffi.dylib';
  return 'libratatui_ffi.so';
}

function exists(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }

function tryPaths() {
  const here = __dirname;
  const name = libName();
  const plat = `${process.platform}-${process.arch}`;
  const cands = [process.env.RATATUI_FFI_PATH].filter(Boolean);
  // prebuilt bundled path (if present)
  cands.push(path.resolve(here, '..', 'prebuilt', plat, name));
  // in-repo build outputs
  const rels = [
    ['..','..','ratatui-ffi','target','release'],
    ['..','..','ratatui-ffi','target','debug'],
    ['..','..','..','ratatui-ffi','target','release'],
    ['..','..','..','ratatui-ffi','target','debug'],
  ];
  for (const segs of rels) {
    cands.push(path.resolve(here, ...segs, name));
  }
  return cands.filter(Boolean);
}

function copyToNative(src) {
  const name = libName();
  const outDir = path.resolve(__dirname, '..', 'native');
  fs.mkdirSync(outDir, { recursive: true });
  const dst = path.join(outDir, name);
  fs.copyFileSync(src, dst);
  return dst;
}

function main() {
  const found = tryPaths().find(exists);
  if (found) {
    const dst = copyToNative(found);
    console.log(`[ratatui-ts] Selected native library -> ${dst}`);
    return;
  }
  console.warn('[ratatui-ts] WARNING: ratatui_ffi native library was not found.');
  console.warn('[ratatui-ts] Set RATATUI_FFI_PATH to the absolute path of the compiled library (.so/.dylib/.dll),');
  console.warn('[ratatui-ts] place a prebuilt in ts/prebuilt/<platform-arch>/, or build locally: cargo build --release -p ratatui_ffi');
}

main();
