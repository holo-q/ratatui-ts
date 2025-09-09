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
  const rels = [
    ['..','..','ratatui-ffi','target','release'],
    ['..','..','ratatui-ffi','target','debug'],
    ['..','..','..','ratatui-ffi','target','release'],
    ['..','..','..','ratatui-ffi','target','debug'],
  ];
  const name = libName();
  const cands = [process.env.RATATUI_FFI_PATH].filter(Boolean);
  for (const segs of rels) {
    cands.push(path.resolve(here, ...segs, name));
  }
  return cands.filter(Boolean);
}

function main() {
  const found = tryPaths().find(exists);
  if (found) {
    console.log(`[ratatui-ts] Using native library: ${found}`);
    return;
  }
  console.warn('[ratatui-ts] WARNING: ratatui_ffi native library was not found.');
  console.warn('[ratatui-ts] Set RATATUI_FFI_PATH to the absolute path of the compiled library (.so/.dylib/.dll).');
  console.warn('[ratatui-ts] Or build it locally: cargo build --release -p ratatui_ffi');
}

main();

