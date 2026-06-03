/*
  gen-native.js — emit src/native.ts in full from the typed IR (bindings.json).

  The interop layer is 100% generated; hand-drift is structurally impossible.
  This supersedes the hand-maintained native.ts + the coverage-guarding done by
  check-introspection.js. The ergonomic OO layer (src/index.ts) stays
  hand-authored and consumes the generated symbols — so the generated file must
  preserve the exact export contract index.ts imports (loadLibrary,
  makeOptionalForeign, charPtr, the value-struct const+type pairs, the typed
  array helpers, and `Align`).

  Pipeline contract: see ../CODEGEN.md (TS column of the type-mapping table).

  Usage:
    node scripts/gen-native.js [--manifest ../ratatui-ffi/bindings.json] [--out src/native.ts]

  Model-then-writer: parse the manifest into a small typed model (mapType is the
  TOTAL IrType -> ref-type-expression mapper; unknown kinds throw), then a
  structured writer assembles the file. Same input -> identical output
  (everything emitted in manifest order).
*/
'use strict';
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--manifest') out.manifest = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else out._.push(a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Type mapping — TOTAL. Every IrType -> a ref-napi type *expression string*
// that is valid inside the generated native.ts. Unknown kinds throw with the
// offending type (no guessing — the manifest is ground truth, a surprise kind
// is a contract break we must see immediately).
// ---------------------------------------------------------------------------

// prim name -> the exported const we declare at the top of native.ts (these
// mirror the hand-written file's named aliases so the body reads cleanly).
const PRIM_REFTYPE = {
  u8: 'u8',
  u16: 'u16',
  u32: 'u32',
  u64: 'u64',
  usize: 'sizeT',
  i8: 'ref.types.int8',
  i16: 'ref.types.int16',
  i32: 'ref.types.int32',
  i64: 'ref.types.int64',
  f32: 'ref.types.float',
  f64: 'ref.types.double',
  bool: 'boolT',
};

// prim name -> the TS scalar used in the generated `type` aliases for structs.
const PRIM_TSTYPE = {
  u8: 'number', u16: 'number', u32: 'number', u64: 'number', usize: 'number',
  i8: 'number', i16: 'number', i32: 'number', i64: 'number',
  f32: 'number', f64: 'number',
  bool: 'boolean',
};

// Map an IrType to the ref-napi type expression used in ffi.Library declarations
// and Struct() field definitions. `structRef` controls whether a by-value
// struct emits the bare Struct const (Library args / Struct fields both want
// the const).
function mapType(t) {
  switch (t.kind) {
    case 'void':
      return "'void'";
    case 'prim': {
      const r = PRIM_REFTYPE[t.name];
      if (!r) throw new Error(`Unknown prim name in IrType: ${JSON.stringify(t)}`);
      return r;
    }
    case 'char':
      // c_char only ever appears under a ptr; a bare char shouldn't occur, but
      // map it honestly rather than guess.
      return 'ref.types.char';
    case 'ptr': {
      // ptr->char  => CString (UTF-8 in/out). Everything else => voidPtr.
      if (t.elem && t.elem.kind === 'char') return 'ref.types.CString';
      return 'voidPtr';
    }
    case 'struct':
      if (t.opaque) {
        // Opaque handle crossed as a pointer.
        return 'voidPtr';
      }
      // Value-struct by value -> the generated Struct const of the same name.
      return t.name;
    default:
      throw new Error(`Unknown IrType kind: ${JSON.stringify(t)}`);
  }
}

// Map an IrType to the TS scalar/type used inside a generated value-struct
// `type` alias (the JS-side view of a Struct field).
function mapTsType(t) {
  switch (t.kind) {
    case 'void':
      return 'void';
    case 'prim': {
      const r = PRIM_TSTYPE[t.name];
      if (!r) throw new Error(`Unknown prim name in IrType: ${JSON.stringify(t)}`);
      return r;
    }
    case 'char':
      return 'number';
    case 'ptr':
      if (t.elem && t.elem.kind === 'char') return 'string | Buffer';
      return 'Buffer';
    case 'struct':
      if (t.opaque) return 'Buffer';
      // Nested by-value value-struct -> its generated TS type alias (same name).
      return t.name;
    default:
      throw new Error(`Unknown IrType kind: ${JSON.stringify(t)}`);
  }
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

function emit(manifest) {
  const L = [];
  const w = (s) => L.push(s == null ? '' : s);

  // Header banner — stamps the provenance + versions so the file announces it
  // is generated and how to regenerate.
  w(`// GENERATED from bindings.json by scripts/gen-native.js — DO NOT EDIT. Regenerate with \`just gen\`. ffi=${manifest.ffi_version} ratatui=${manifest.ratatui_version}`);
  w('');
  w("import path from 'path';");
  w("import fs from 'fs';");
  w("import ffi from 'ffi-napi';");
  w("import ref from 'ref-napi';");
  w("const ArrayType = require('ref-array-di')(ref);");
  w("const Struct = require('ref-struct-di')(ref);");
  w('');

  // Basic C types — the named aliases mapType refers to.
  w('// Basic C types');
  w('export const voidPtr = ref.refType(ref.types.void);');
  w('export const charPtr = ref.refType(ref.types.char);');
  w('export const charPtrPtr = ref.refType(charPtr);');
  w('export const boolT = ref.types.bool;');
  w('export const u8 = ref.types.uint8;');
  w('export const u16 = ref.types.uint16;');
  w('export const u32 = ref.types.uint32;');
  w('export const u64 = ref.types.uint64;');
  w('export const sizeT = ref.types.size_t || ref.types.ulong; // fallback');
  w('');

  // Value-structs. The manifest sorts struct *names* alphabetically, which
  // breaks JS const-before-use (a Struct field referencing another value-struct
  // by value needs that const already bound — e.g. FfiCanvasLine.style ->
  // FfiStyle). We topo-sort by by-value struct dependencies, preserving manifest
  // order as the deterministic tiebreaker, and never reorder *fields* within a
  // struct (field order IS the C layout).
  w('// Value-structs mirroring the C ABI (field order == manifest order == C layout)');
  const ordered = topoSortStructs(manifest.value_structs);
  const declared = new Set();
  for (const s of ordered) {
    const fieldLines = s.fields.map((f) => `  ${f.name}: ${mapType(f.type)},`);
    w(`export const ${s.name} = Struct({`);
    for (const fl of fieldLines) w(fl);
    w('});');
    const tsFields = s.fields.map((f) => `${f.name}: ${mapTsType(f.type)}`).join('; ');
    w(`export type ${s.name} = { ${tsFields} };`);
    w('');
    declared.add(s.name);
  }

  // Enums + bitflags as named-int const objects. `Align` is re-exported by
  // index.ts and historically named without the `Ffi` prefix; provide that
  // alias while still emitting the canonical FfiAlign.
  w('// Enums (named integer constants)');
  for (const e of manifest.enums) {
    emitConstEnum(w, e.name, e.variants);
  }
  w('');
  w('// Bitflags (named integer constants)');
  for (const b of manifest.bitflags) {
    emitConstEnum(w, b.name, b.variants);
  }
  w('');
  // Compatibility aliases used by index.ts and prior call sites.
  w('// Compatibility aliases (prior unprefixed names consumed by index.ts)');
  w('export const Align = FfiAlign;');
  w('export const Direction = { Vertical: 0, Horizontal: 1 } as const;');
  w('export const Borders = FfiBorders;');
  w('');

  // Library name resolution — preserved verbatim from the hand-written file.
  w(libraryResolver());
  w('');

  // The ffi.Library binding — every export in manifest order.
  w('export type NativeLib = ReturnType<typeof loadLibrary>;');
  w('');
  w('export function loadLibrary(explicitPath?: string) {');
  w('  const libPath = explicitPath || tryPaths()[0];');
  w('  if (!libPath) {');
  w('    const tried = [process.env.RATATUI_FFI_PATH, ...tryPaths()].filter(Boolean).join(\'\\n - \');');
  w('    throw new Error(');
  w('      `Unable to locate ratatui_ffi library. Set RATATUI_FFI_PATH or place the compiled library in one of:\\n - ${tried}`');
  w('    );');
  w('  }');
  w('  loadedPath = libPath;');
  w('');
  w('  const lib = ffi.Library(libPath, {');
  for (const fn of manifest.functions) {
    const ret = mapType(fn.ret);
    const args = fn.params.map((p) => mapType(p.type)).join(', ');
    const tail = fn.cfg_feature ? ` // cfg_feature=${fn.cfg_feature}` : '';
    w(`    ${fn.name}: [${ret}, [${args}]],${tail}`);
  }
  w('  });');
  w('');
  w('  return lib;');
  w('}');
  w('');

  // Runtime helpers — preserved verbatim (index.ts imports makeOptionalForeign,
  // and the typed-array helpers; tests/headless code uses getLoadedLibPath).
  w(runtimeHelpers());
  w('');

  return L.join('\n') + '\n';
}

// Topologically sort value-structs so every by-value struct dependency is
// declared before its dependent (JS const-before-use). Deterministic: visits in
// manifest order, recurses into dependencies first; cycles throw (a by-value
// struct cycle is impossible in C anyway, so a cycle means a corrupt manifest).
function topoSortStructs(structs) {
  const byName = new Map(structs.map((s) => [s.name, s]));
  const out = [];
  const done = new Set();
  const onStack = new Set();
  function visit(s) {
    if (done.has(s.name)) return;
    if (onStack.has(s.name)) {
      throw new Error(`value-struct dependency cycle through ${s.name}`);
    }
    onStack.add(s.name);
    for (const f of s.fields) {
      const t = f.type;
      if (t.kind === 'struct' && !t.opaque) {
        const dep = byName.get(t.name);
        if (!dep) throw new Error(`value-struct ${s.name} references unknown by-value struct ${t.name}`);
        visit(dep);
      }
    }
    onStack.delete(s.name);
    done.add(s.name);
    out.push(s);
  }
  for (const s of structs) visit(s);
  return out;
}

function emitConstEnum(w, name, variants) {
  const body = variants.map((v) => `${v.name}: ${v.value}`).join(', ');
  w(`export const ${name} = { ${body} } as const;`);
}

function libraryResolver() {
  return [
    'function platformLibName(): string {',
    "  if (process.platform === 'win32') return 'ratatui_ffi.dll';",
    "  if (process.platform === 'darwin') return 'libratatui_ffi.dylib';",
    "  return 'libratatui_ffi.so';",
    '}',
    '',
    'function tryPaths(): string[] {',
    '  const env = process.env.RATATUI_FFI_PATH;',
    '  const here = path.resolve(__dirname);',
    '  const candidates = [] as string[];',
    '  if (env) candidates.push(env);',
    '  // packaged native/ location inside this module',
    "  candidates.push(path.resolve(here, '..', 'native', platformLibName()));",
    "  candidates.push(path.resolve(here, 'native', platformLibName()));",
    '  // prebuilt per-platform locations',
    '  const plat = `${process.platform}-${process.arch}`;',
    "  candidates.push(path.resolve(here, '..', 'prebuilt', plat, platformLibName()));",
    "  candidates.push(path.resolve(here, 'prebuilt', plat, platformLibName()));",
    '  // in-repo common locations',
    '  const rels = [',
    "    ['..', '..', 'ratatui-ffi', 'target', 'release'],",
    "    ['..', '..', 'ratatui-ffi', 'target', 'debug'],",
    "    ['..', '..', '..', 'ratatui-ffi', 'target', 'release'],",
    "    ['..', '..', '..', 'ratatui-ffi', 'target', 'debug'],",
    '  ];',
    '  for (const segs of rels) {',
    '    candidates.push(path.resolve(here, ...segs, platformLibName()));',
    '  }',
    '  return candidates.filter(p => fs.existsSync(p));',
    '}',
    '',
    'let loadedPath: string | null = null;',
    '',
    'export function getLoadedLibPath(): string | null { return loadedPath; }',
  ].join('\n');
}

function runtimeHelpers() {
  return [
    '// Optional symbol support via DynamicLibrary',
    'export function makeOptionalForeign<Fn extends Function>(',
    '  name: string,',
    '  ret: any,',
    '  args: any[],',
    '): Fn | null {',
    '  if (!loadedPath) return null;',
    '  try {',
    '    const dlib = ffi.DynamicLibrary(loadedPath);',
    '    const ptr = dlib.get(name);',
    '    if (!ptr || ptr.isNull()) return null;',
    '    const Foreign = ffi.ForeignFunction(ptr, ret, args);',
    '    return Foreign as unknown as Fn;',
    '  } catch {',
    '    return null;',
    '  }',
    '}',
    '',
    '// Typed array + draw-command helpers consumed by the ergonomic layer',
    'export const FfiDrawCmdArray = (len: number) => ArrayType(FfiDrawCmd, len);',
    'export const U64Array = (len: number) => ArrayType(u64, len);',
    'export const F64Array = (len: number) => ArrayType(ref.types.double, len);',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..');
  const manifestPath = args.manifest
    ? path.resolve(args.manifest)
    : path.resolve(repoRoot, '..', 'ratatui-ffi', 'bindings.json');
  const outPath = args.out
    ? path.resolve(args.out)
    : path.resolve(repoRoot, 'src', 'native.ts');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const text = emit(manifest);
  fs.writeFileSync(outPath, text);

  console.log(`[gen-native] wrote ${outPath}`);
  console.log(`[gen-native] functions=${manifest.functions.length} value_structs=${manifest.value_structs.length} enums=${manifest.enums.length} bitflags=${manifest.bitflags.length}`);
  console.log(`[gen-native] ffi=${manifest.ffi_version} ratatui=${manifest.ratatui_version}`);
}

main();
