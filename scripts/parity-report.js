/*
  parity-report.js — prove the generated native.ts is a superset of the prior
  hand-written interop (per CODEGEN.md emitter responsibility #2).

  Compares the ffi.Library declarations in the OLD native.ts (git HEAD by
  default) against the NEW generated one, producing three lists:
    added   — fns the manifest has that the old file lacked (drift gap closed)
    removed — fns the old file had that the manifest lacks (investigate)
    changed — fns whose [ret, [args]] tuple differs (investigate ABI)

  Signature tokens are normalized so cosmetic spelling differences don't read as
  ABI changes BUT real pointer-policy normalizations DO surface: the old file
  used typed out-pointers (ref.refType(u16), ref.refType(FfiRect), ...) where the
  generated file uses the uniform `voidPtr` per the TS mapping column. Those are
  the documented "silent hand-drift normalized away" and legitimately appear as
  `changed`.

  Usage: node scripts/parity-report.js [--old <path>] [--new src/native.ts] [--out scripts/parity-report.txt]
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--old') out.old = argv[++i];
    else if (a === '--new') out.new = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

// Extract `name: [ret, [args...]]` entries from a native.ts ffi.Library block.
// Returns Map<name, { ret, args:[...] }> with normalized tokens.
function parseLibrary(src) {
  const map = new Map();
  const keyRe = /(ratatui_[A-Za-z0-9_]+)\s*:\s*\[/g;
  let m;
  while ((m = keyRe.exec(src))) {
    const name = m[1];
    let i = keyRe.lastIndex - 1; // at the opening '[' of the tuple
    const tuple = sliceBracket(src, i); // includes outer [ ... ]
    if (!tuple) continue;
    const inner = tuple.slice(1, -1); // drop outer [ ]
    // ret is everything up to the first top-level comma; args is the [...] after.
    const argStart = inner.indexOf('[');
    if (argStart === -1) continue;
    const ret = norm(inner.slice(0, inner.indexOf(',')));
    const argsBlock = sliceBracket(inner, argStart);
    const argsRaw = argsBlock.slice(1, -1);
    const args = splitTopLevel(argsRaw).map(norm).filter((x) => x.length);
    map.set(name, { ret, args });
  }
  return map;
}

// Return the bracket-balanced substring starting at index `start` (src[start] === '[').
function sliceBracket(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

// Split a comma list at top-level (ignoring commas inside nested [ ] or ( )).
function splitTopLevel(s) {
  const parts = [];
  let depth = 0, tok = '';
  for (const c of s) {
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    if (c === ',' && depth === 0) { parts.push(tok); tok = ''; }
    else tok += c;
  }
  if (tok.trim()) parts.push(tok);
  return parts;
}

// Normalize a ref-type token to a canonical ABI form. Aliases that denote the
// same wire type collapse; pointer policy differences are intentionally
// preserved (typed ref.refType(X) stays distinct from voidPtr) so the report
// surfaces the normalization the generator performed.
function norm(t) {
  let s = t.trim().replace(/\s+/g, '');
  s = s.replace(/^'|'$/g, '');
  s = s.replace(/^"|"$/g, '');
  const aliases = {
    "ref.types.bool": 'bool', boolT: 'bool', bool: 'bool',
    "ref.types.uint8": 'uint8', u8: 'uint8', uint8: 'uint8',
    "ref.types.uint16": 'uint16', u16: 'uint16', uint16: 'uint16',
    "ref.types.uint32": 'uint32', u32: 'uint32', uint32: 'uint32',
    "ref.types.uint64": 'uint64', u64: 'uint64', uint64: 'uint64',
    "ref.types.int32": 'int32', int32: 'int32',
    "ref.types.float": 'float', float: 'float',
    "ref.types.double": 'double', double: 'double',
    "ref.types.size_t||ref.types.ulong": 'size_t', sizeT: 'size_t', size_t: 'size_t',
    "ref.types.CString": 'cstring',
    "ref.refType(ref.types.void)": 'voidptr', voidPtr: 'voidptr',
    void: 'void',
  };
  return aliases[s] || s;
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..');
  const newPath = args.new ? path.resolve(args.new) : path.resolve(repoRoot, 'src', 'native.ts');

  let oldSrc;
  if (args.old) {
    oldSrc = fs.readFileSync(path.resolve(args.old), 'utf8');
  } else {
    oldSrc = execSync('git show HEAD:src/native.ts', { cwd: repoRoot, encoding: 'utf8' });
  }
  const newSrc = fs.readFileSync(newPath, 'utf8');

  const oldMap = parseLibrary(oldSrc);
  const newMap = parseLibrary(newSrc);

  const added = [...newMap.keys()].filter((n) => !oldMap.has(n)).sort();
  const removed = [...oldMap.keys()].filter((n) => !newMap.has(n)).sort();
  const changed = [];
  for (const name of [...newMap.keys()].filter((n) => oldMap.has(n)).sort()) {
    const o = oldMap.get(name), n = newMap.get(name);
    const oSig = `${o.ret}(${o.args.join(',')})`;
    const nSig = `${n.ret}(${n.args.join(',')})`;
    if (oSig !== nSig) changed.push({ name, old: oSig, new: nSig });
  }

  const lines = [];
  lines.push('# Parity report — generated native.ts vs prior hand-written (git HEAD)');
  lines.push(`# old declarations: ${oldMap.size}   new declarations: ${newMap.size}`);
  lines.push('');
  lines.push(`## added (${added.length}) — manifest had, old file lacked (drift gap closed)`);
  for (const n of added) lines.push(`  + ${n}`);
  lines.push('');
  lines.push(`## removed (${removed.length}) — old file had, manifest lacks (investigate)`);
  for (const n of removed) lines.push(`  - ${n}`);
  lines.push('');
  lines.push(`## changed (${changed.length}) — signature tuple differs (investigate ABI)`);
  for (const c of changed) {
    lines.push(`  ~ ${c.name}`);
    lines.push(`      old: ${c.old}`);
    lines.push(`      new: ${c.new}`);
  }
  lines.push('');

  const report = lines.join('\n');
  const outPath = args.out ? path.resolve(args.out) : path.resolve(repoRoot, 'scripts', 'parity-report.txt');
  fs.writeFileSync(outPath, report);
  process.stdout.write(report);
  console.log(`\n[parity] wrote ${outPath}`);
  console.log(`[parity] added=${added.length} removed=${removed.length} changed=${changed.length}`);
}

main();
