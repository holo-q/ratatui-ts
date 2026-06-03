/*
  gen-wrappers.js — Stage 2: emit src/wrappers.generated.ts from the typed IR.

  Stage 1 (gen-native.js) generates the 100%-mechanical interop layer
  (src/native.ts). Stage 2 folds the *ergonomic* OO layer for the regular
  patterns, driven by the same manifest (../ratatui-ffi/bindings.json). See
  ../ratatui-ffi/CODEGEN.md "Stage 2" for the governing spec.

  ── Composition shape (the cleanest non-colliding TS form) ──────────────────
  The hand-written ergonomic layer (src/index.ts) is a set of concrete widget
  classes (Paragraph, List, Table, …), each exposing `get handle(): Buffer`.
  That handle is the seam. We attach generated methods WITHOUT touching the
  class bodies, and WITHOUT a runtime import cycle, via:

    1. `import type { Paragraph, … } from './index'`  — type-only (erased), so
       NO runtime dependency on index.ts. The arrow points one way: index.ts
       imports this module and CALLS the installer after its classes exist.
    2. `declare module './index' { interface Paragraph { … } }`              —
       declaration-merging: the generated method SIGNATURES merge onto the
       hand classes, so callers get full typing and editor completion.
    3. `installGenerated(deps)` — the runtime install. index.ts passes the class
       constructors + `lib` + the span builders + `ref` in; we install each
       generated member onto the right prototype/constructor, guarded by a
       collision check (`name in target` ⇒ SKIP, the hand version wins). This
       dependency inversion (index drives install, not the reverse) means the
       classes are guaranteed defined before any prototype write — no cycle, no
       temporal-dead-zone hazard from ESM hoisting.

  Static helpers (`headless_render_<widget>`) attach to the class as static
  methods (`renderHeadless`) the same way (install onto the constructor, merge
  via `namespace`).

  ── Verb taxonomy (CODEGEN.md Stage 2 table) ────────────────────────────────
    _set_<prop>(h, …)        → fluent setter returning `this`, named <prop> camelCased
    _append_<x> / _add_<x>   → append/add method
    headless_render_<w>(…)   → static renderHeadless helper on the widget
    _new / _new_* / _free    → lifecycle, NEVER generated (hand-owned ctor / registry)
    _reserve_* / capacity    → low-level perf, left raw
  Everything else (terminal control, draw_*_in, layout_split, color/version,
  state-object setters with no host class) is left raw and reported in the
  residue triage — a smaller honest residue beats a padded one.

  Model-then-writer, CommonJS, deterministic (emits in manifest order; same
  input ⇒ identical output).

  Usage:
    node scripts/gen-wrappers.js [--manifest <path>] [--out src/wrappers.generated.ts]
*/
'use strict';
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--manifest') out.manifest = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Group → hand class. The `<group>` token of ratatui_<group>_<verb…> maps to
// the wrapper class in index.ts. Only groups with a concrete hand class are
// candidates for attachment; others fall through to residue.
// ---------------------------------------------------------------------------
const GROUP_CLASS = {
  paragraph: 'Paragraph',
  list: 'List',
  table: 'Table',
  gauge: 'Gauge',
  tabs: 'Tabs',
  barchart: 'BarChart',
  sparkline: 'Sparkline',
  chart: 'Chart',
  canvas: 'Canvas',
  linegauge: 'LineGauge',
  scrollbar: 'Scrollbar',
};

// headless_render_<token> → the class whose static renderHeadless we emit.
const HEADLESS_CLASS = {
  canvas: 'Canvas',
  linegauge: 'LineGauge',
};

// ---------------------------------------------------------------------------
// Marshalling: an IrType → how a generated wrapper passes a JS arg to the
// interop call, plus the TS parameter type. We mirror index.ts exactly.
//   - ptr→FfiSpan (preceded by a usize len)   ⇒ a `spans: SpanInput[]` param,
//     marshalled via buildSpans(...) — the dominant Stage-2 pattern.
//   - ptr→FfiLineSpans (+ len)                 ⇒ `lines: SpanInput[][]` via buildLineSpans.
//   - prim / bool / enum                       ⇒ scalar number/boolean passthrough.
//   - ptr→char                                 ⇒ `string | null` (index.ts uses `?? ref.NULL`).
// Unsupported shapes return null → the fn falls through to residue (honest).
// ---------------------------------------------------------------------------

function isSpanPtr(t) { return t.kind === 'ptr' && t.elem.kind === 'struct' && t.elem.name === 'FfiSpan'; }
function isLineSpanPtr(t) { return t.kind === 'ptr' && t.elem.kind === 'struct' && t.elem.name === 'FfiLineSpans'; }
function isCharPtr(t) { return t.kind === 'ptr' && t.elem.kind === 'char'; }
function isPrim(t) { return t.kind === 'prim'; }

// snake_case verb tail → camelCase method name.
function camel(s) { return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()); }

// ---------------------------------------------------------------------------
// Collision rule (CODEGEN.md Stage 2): "Never overwrite a hand-written method
// — detect name collision and skip (the hand version wins), and report each
// skip." We apply this at the FFI-function level (the truthful seam): if the
// hand-written layer already references `ratatui_<...>` anywhere in src/ outside
// the generated files, that fn is HAND-COVERED and we do NOT generate a wrapper
// for it — generating a same-behavior method under a different camelCase name
// would just pad the API with a duplicate. This is exactly the residue-report's
// "wrapped" definition, so generation targets precisely the residue worklist.
// ---------------------------------------------------------------------------
function readHandCovered(srcDir) {
  const skip = new Set(['native.ts', 'wrappers.generated.ts', 'ffi-napi.d.ts']);
  const files = fs.readdirSync(srcDir).filter((f) => (f.endsWith('.ts') || f.endsWith('.d.ts')) && !skip.has(f));
  const text = files.map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n');
  const covered = new Set();
  const re = /\bratatui_[a-z0-9_]+\b/g;
  let m;
  while ((m = re.exec(text))) covered.add(m[0]);
  return covered;
}

// ---------------------------------------------------------------------------
// Plan one function into a wrapper descriptor, or null to leave it raw.
// Returns { cls, kind:'method'|'static', name, params:[{ts}], call, ret }.
// ---------------------------------------------------------------------------
function planFn(fn, handCovered) {
  // Hand layer already wraps this exact FFI fn → never generate (hand wins).
  if (handCovered.has(fn.name)) return null;
  const name = fn.name;
  const m = /^ratatui_([a-z0-9]+)_(.+)$/.exec(name);
  if (!m) return null;
  const group = m[1];
  const verb = m[2];

  // headless_render_<w> — static render helper. Handle group=="headless".
  if (group === 'headless' && verb.startsWith('render_')) {
    const token = verb.slice('render_'.length);
    const cls = HEADLESS_CLASS[token];
    if (!cls) return null; // frame_styles / list_state / ratatuilogo etc → residue
    return planHeadless(fn, cls, token);
  }

  const cls = GROUP_CLASS[group];
  if (!cls) return null;

  // Lifecycle / perf — never generate.
  if (verb === 'new' || verb.startsWith('new_') || verb === 'free') return null;
  if (verb.startsWith('reserve_')) return null;

  if (verb.startsWith('set_')) return planSetter(fn, cls, verb.slice('set_'.length));
  if (verb.startsWith('append_')) return planAppendAdd(fn, cls, verb, 'append_');
  if (verb.startsWith('add_')) return planAppendAdd(fn, cls, verb, 'add_');
  return null;
}

// Marshal the non-handle params (params[1..]) into a TS signature + a call
// argument list referencing the marshalled locals. The first param is always
// the widget handle (`this.handle`). Returns { params, preamble, args, post }
// or null if any param shape is unsupported.
function marshalParams(fn) {
  const ps = fn.params.slice(1); // drop handle
  const tsParams = [];
  const preamble = [];
  const args = ['(this as any).handle'];
  const post = [];
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    const t = p.type;
    // span-array followed by its usize length: consume both as one JS param.
    if (isSpanPtr(t) && ps[i + 1] && ps[i + 1].type.kind === 'prim' && ps[i + 1].type.name === 'usize') {
      tsParams.push(`${camel(p.name)}: SpanInput[]`);
      preamble.push(`  const __${i} = buildSpans(${camel(p.name)});`);
      args.push(`__${i}.ptr`, `__${i}.len`);
      post.push(`  __${i}.free();`);
      i++; // skip the len param
      continue;
    }
    if (isLineSpanPtr(t) && ps[i + 1] && ps[i + 1].type.kind === 'prim' && ps[i + 1].type.name === 'usize') {
      tsParams.push(`${camel(p.name)}: SpanInput[][]`);
      preamble.push(`  const __${i} = buildLineSpans(${camel(p.name)});`);
      args.push(`__${i}.ptr`, `__${i}.len`);
      post.push(`  __${i}.free();`);
      i++;
      continue;
    }
    if (isCharPtr(t)) {
      tsParams.push(`${camel(p.name)}: string | null`);
      args.push(`(${camel(p.name)} ?? ref.NULL)`);
      continue;
    }
    if (isPrim(t)) {
      const ts = t.name === 'bool' ? 'boolean' : 'number';
      tsParams.push(`${camel(p.name)}: ${ts}`);
      args.push(camel(p.name));
      continue;
    }
    return null; // by-value struct / opaque handle arg etc → leave raw
  }
  return { tsParams, preamble, args, post };
}

function planSetter(fn, cls, prop) {
  const mp = marshalParams(fn);
  if (!mp) return null;
  return { cls, kind: 'method', fluent: true, name: camel(prop), ffi: fn.name, ...mp };
}

function planAppendAdd(fn, cls, verb, prefix) {
  const mp = marshalParams(fn);
  if (!mp) return null;
  return { cls, kind: 'method', fluent: false, name: camel(verb), ffi: fn.name, ...mp };
}

// headless_render_<w>(width, height, handle, out**) -> bool. Emit a static
// `renderHeadless(width, height, w: Cls): string` mirroring index.ts's
// headlessRender* (alloc char**, read CString, ratatui_string_free).
function planHeadless(fn, cls, token) {
  return { cls, kind: 'static', name: 'renderHeadless', ffi: fn.name, token };
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------
function emit(manifest, handCovered) {
  const L = [];
  const w = (s) => L.push(s == null ? '' : s);

  const plans = [];
  for (const fn of manifest.functions) {
    const p = planFn(fn, handCovered);
    if (p) plans.push(p);
  }

  const classes = [...new Set(plans.map((p) => p.cls))].sort();

  w(`// GENERATED from bindings.json by scripts/gen-wrappers.js — DO NOT EDIT. Regenerate with \`just gen\`. ffi=${manifest.ffi_version} ratatui=${manifest.ratatui_version}`);
  w('//');
  w('// Stage-2 ergonomic wrappers: fluent setters / append-add / static headless');
  w('// render helpers, attached to the hand-written widget classes in ./index via');
  w('// declaration-merging (compile-time signatures) + guarded prototype install');
  w('// (runtime; hand methods always win on name collision). index.ts imports this');
  w('// module and calls installGenerated(...) once, after its classes exist —');
  w('// the dependency points one way, so there is no runtime import cycle.');
  w('// See scripts/gen-wrappers.js for the full design.');
  w('');
  // type-only import of the hand classes — merged onto, never re-defined. Erased
  // at runtime, so importing index.ts here costs nothing and creates no cycle.
  w(`import type { ${classes.join(', ')} } from './index';`);
  w('');
  // The marshalling input type, mirrored from index.ts's hand layer.
  w("export type SpanInput = { text: string; style?: { fg?: number; bg?: number; mods?: number } };");
  w('');
  // Everything the installer touches is injected by index.ts (no module-level
  // import of index symbols), so the class constructors are guaranteed live.
  w('// Dependencies injected by index.ts so this module never imports index at');
  w('// runtime — index.ts owns lib + the classes and passes them in.');
  w('export interface GeneratedDeps {');
  w('  ref: any;');
  w('  charPtr: any;');
  w('  lib: any;');
  w('  buildSpans: (spans: SpanInput[]) => { ptr: Buffer; len: number; free: () => void };');
  w('  buildLineSpans: (lines: SpanInput[][]) => { ptr: Buffer; len: number; free: () => void };');
  for (const cls of classes) w(`  ${cls}: any;`);
  w('}');
  w('');

  // ── Declaration-merging: signatures onto the hand classes ────────────────
  w('// Compile-time: merge generated method signatures onto the hand classes.');
  for (const cls of classes) {
    const methods = plans.filter((p) => p.cls === cls && p.kind === 'method');
    if (!methods.length) continue;
    w(`declare module './index' {`);
    w(`  interface ${cls} {`);
    for (const p of methods) {
      const ret = p.fluent ? `this` : 'void';
      w(`    ${p.name}(${p.tsParams.join(', ')}): ${ret};`);
    }
    w(`  }`);
    w(`}`);
  }
  w('');

  // ── Runtime installer ─────────────────────────────────────────────────────
  w('// index.ts calls this exactly once after constructing `lib` + classes.');
  w('export function installGenerated(d: GeneratedDeps): void {');
  w('  const { ref, charPtr, lib, buildSpans, buildLineSpans } = d;');
  w('  // Hand method wins: only install if the name is not already present');
  w('  // (own or inherited) on the target.');
  w('  const def = (target: any, name: string, value: Function): void => {');
  w('    if (name in target) return;');
  w("    Object.defineProperty(target, name, { value, writable: true, configurable: true, enumerable: false });");
  w('  };');
  for (const cls of classes) {
    const methods = plans.filter((p) => p.cls === cls && p.kind === 'method');
    const statics = plans.filter((p) => p.cls === cls && p.kind === 'static');
    for (const p of methods) {
      w(`  def(d.${cls}.prototype, '${p.name}', function (this: any${p.tsParams.length ? ', ' + p.tsParams.join(', ') : ''}): ${p.fluent ? 'any' : 'void'} {`);
      for (const line of p.preamble) w('  ' + line);
      if (p.post.length) {
        w(`    try { lib.${p.ffi}(${p.args.join(', ')}); } finally {`);
        for (const line of p.post) w('  ' + line);
        w(`    }`);
      } else {
        w(`    lib.${p.ffi}(${p.args.join(', ')});`);
      }
      if (p.fluent) w('    return this;');
      w('  });');
    }
    for (const p of statics) {
      w(`  def(d.${cls}, '${p.name}', function (width: number, height: number, w: any): string {`);
      w('    const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**');
      w(`    const ok = lib.${p.ffi}(width, height, (w as any).handle, outPtr);`);
      w(`    if (!ok) throw new Error('${p.ffi} failed');`);
      w('    const cstrPtr = outPtr.deref();');
      w('    const str = ref.readCString(cstrPtr, 0);');
      w('    lib.ratatui_string_free(cstrPtr);');
      w('    return str;');
      w('  });');
    }
  }
  w('}');

  return { text: L.join('\n') + '\n', plans };
}

// ---------------------------------------------------------------------------
// Residue triage (CODEGEN.md Stage 2 reporting). For every FFI fn NOT covered
// by the hand layer, classify it into one of three buckets:
//   wrapped-now       — a Stage-2 wrapper was generated for it.
//   deliberately-raw  — free/reserve/internal/utility; we explain WHY (one line).
//   still-unwrapped   — genuine remainder a human must still wrap. Goal: → 0.
// Each deliberately-raw line carries its reason so the exclusion is justified,
// not silently padded.
// ---------------------------------------------------------------------------
function rawReason(name) {
  const m = /^ratatui_([a-z0-9]+)_(.+)$/.exec(name);
  const verb = m ? m[2] : name;
  if (verb === 'free' || verb.endsWith('_free')) return 'lifecycle: freed via FinalizationRegistry / hand free()';
  if (verb === 'new' || verb.startsWith('new_')) return 'lifecycle: construction is hand-owned (ctor / static factory)';
  if (verb.startsWith('reserve_')) return 'low-level capacity hint — left raw per taxonomy';
  // state objects (ListState/TableState) have no hand-written host class yet.
  if (/_state_/.test(name)) return 'needs hand-authored state class (no host for fluent setter)';
  if (name.startsWith('ratatui_layout_split')) return 'lower-level layout; hand layer uses layoutSplitEx2';
  if (name.startsWith('ratatui_terminal_') || name.startsWith('ratatui_clear_in') || /_draw_(sized_)?in$/.test(name))
    return 'terminal/draw orchestration — belongs on Terminal/Frame machinery, not a widget setter';
  if (name.startsWith('ratatui_headless_render_'))
    return 'headless helper with no widget host class (frame/logo) — drawn via hand frame helpers';
  if (name.startsWith('ratatui_color_') || name.startsWith('ratatui_ffi_') || name === 'ratatui_string_free')
    return 'not widget-bound — covered by hand helpers (colorHelper / getVersion / finalizers)';
  return 'utility/internal — no idiomatic fluent shape';
}

function triage(manifest, handCovered, plans) {
  const wrappedFfi = new Set(plans.map((p) => p.ffi));
  const wrappedNow = [];
  const deliberatelyRaw = [];
  const stillUnwrapped = [];
  for (const fn of manifest.functions) {
    const n = fn.name;
    if (handCovered.has(n)) continue; // already wrapped by hand → not residue
    if (wrappedFfi.has(n)) { wrappedNow.push(n); continue; }
    const reason = rawReason(n);
    if (reason.startsWith('utility/internal')) stillUnwrapped.push(n);
    else deliberatelyRaw.push({ name: n, reason });
  }
  wrappedNow.sort();
  deliberatelyRaw.sort((a, b) => a.name.localeCompare(b.name));
  stillUnwrapped.sort();
  return { wrappedNow, deliberatelyRaw, stillUnwrapped };
}

function writeResidue(outPath, manifest, handCovered, t) {
  const handCount = manifest.functions.filter((f) => handCovered.has(f.name)).length;
  const L = [];
  L.push('# Residue triage — Stage 2 (generated by scripts/gen-wrappers.js).');
  L.push(`# total fns: ${manifest.functions.length}   hand-wrapped: ${handCount}   wrapped-now: ${t.wrappedNow.length}   deliberately-raw: ${t.deliberatelyRaw.length}   still-unwrapped: ${t.stillUnwrapped.length}`);
  L.push('# "hand-wrapped" = referenced in the hand layer (index.ts); excluded below.');
  L.push('');
  L.push(`## wrapped-now (${t.wrappedNow.length}) — Stage-2 generated an ergonomic wrapper`);
  for (const n of t.wrappedNow) L.push(n);
  L.push('');
  L.push(`## deliberately-raw (${t.deliberatelyRaw.length}) — left raw on purpose, reason each`);
  for (const r of t.deliberatelyRaw) L.push(`${r.name}\t# ${r.reason}`);
  L.push('');
  L.push(`## still-unwrapped (${t.stillUnwrapped.length}) — genuine remaining worklist (target: 0)`);
  for (const n of t.stillUnwrapped) L.push(n);
  L.push('');
  fs.writeFileSync(outPath, L.join('\n'));
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..');
  const manifestPath = args.manifest
    ? path.resolve(args.manifest)
    : path.resolve(repoRoot, '..', 'ratatui-ffi', 'bindings.json');
  const outPath = args.out
    ? path.resolve(args.out)
    : path.resolve(repoRoot, 'src', 'wrappers.generated.ts');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const srcDir = path.resolve(repoRoot, 'src');
  const handCovered = readHandCovered(srcDir);
  const { text, plans } = emit(manifest, handCovered);
  fs.writeFileSync(outPath, text);

  const t = triage(manifest, handCovered, plans);
  const residuePath = path.resolve(repoRoot, 'scripts', 'residue.txt');
  writeResidue(residuePath, manifest, handCovered, t);

  console.log(`[gen-wrappers] wrote ${outPath}`);
  const byKind = plans.reduce((a, p) => ((a[p.kind] = (a[p.kind] || 0) + 1), a), {});
  console.log(`[gen-wrappers] wrappers=${plans.length} (${JSON.stringify(byKind)})`);
  console.log(`[gen-wrappers] residue → ${residuePath}`);
  console.log(`[gen-wrappers] wrapped-now=${t.wrappedNow.length} deliberately-raw=${t.deliberatelyRaw.length} still-unwrapped=${t.stillUnwrapped.length}`);
}

main();
