/*
  Binding coverage checker for TypeScript
  - Compares ffi_introspect --json exports with functions registered in ts/src/native.ts
  - Optional feature-bit gating (via --lib path to compiled native library)
  - Optional allowlist (--allow file) and JSON report (--out)

  Usage:
    node scripts/check-introspection.js /path/to/ffi.json [--lib /path/to/lib] [--allow allow.txt] [--features-map scripts/features-map.json] [--out report.json]
*/
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lib') out.lib = argv[++i];
    else if (a === '--allow') out.allow = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--features-map') out.featuresMap = argv[++i];
    else out._.push(a);
  }
  return out;
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadAllowlist(p) {
  if (!p) return new Set();
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return new Set(lines);
}

function compileFeaturePatterns(map) {
  const out = {};
  for (const [bitName, patterns] of Object.entries(map || {})) {
    out[bitName] = patterns.map(p => new RegExp(p));
  }
  return out;
}

function featureForExport(name, patternMap) {
  for (const [bit, regs] of Object.entries(patternMap)) {
    if (regs.some(r => r.test(name))) return bit;
  }
  return null;
}

function readFeatureBitsFromLib(libPath) {
  try {
    const ffi = require('ffi-napi');
    const lib = ffi.Library(libPath, { ratatui_ffi_feature_bits: ['uint32', []] });
    return lib.ratatui_ffi_feature_bits();
  } catch (e) {
    console.warn(`[check-introspection] Failed to load feature bits from lib: ${e.message}`);
    return null;
  }
}

function bitMaskForName(name) {
  const idx = {
    SCROLLBAR: 0,
    CANVAS: 1,
    STYLE_DUMP_EX: 2,
    BATCH_TABLE_ROWS: 3,
    BATCH_LIST_ITEMS: 4,
    COLOR_HELPERS: 5,
    AXIS_LABELS: 6,
  }[name];
  return idx == null ? 0 : (1 << idx);
}

function isBitSet(bits, name) {
  const m = bitMaskForName(name);
  return (bits & m) === m;
}

function parseDeclaredFromNativeTs(src) {
  // Find the ffi.Library second argument object literal and parse entries
  const keyRegex = /(\s+)(ratatui_[a-zA-Z0-9_]+)\s*:/g;
  const results = [];
  let m;
  while ((m = keyRegex.exec(src))) {
    const name = m[2];
    // Find the array expression after ':' and parse arg count
    let i = keyRegex.lastIndex;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] !== '[') { results.push({ name, valid: false, args: null }); continue; }
    // capture outer array [ ret , [ args... ] ] with bracket depth
    let depth = 0, start = i, end = i;
    for (; end < src.length; end++) {
      const ch = src[end];
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) { end++; break; } }
    }
    const arr = src.slice(start, end);
    // find first inner args array: locate '[' after first comma
    const commaIdx = arr.indexOf(',');
    let innerStart = arr.indexOf('[', commaIdx + 1);
    if (innerStart === -1) { results.push({ name, valid: false, args: null }); continue; }
    // match inner args array brackets
    let d2 = 0, j = innerStart, innerEnd = innerStart;
    for (; innerEnd < arr.length; innerEnd++) {
      const ch = arr[innerEnd];
      if (ch === '[') d2++;
      else if (ch === ']') { d2--; if (d2 === 0) { innerEnd++; break; } }
    }
    const argsRaw = arr.slice(innerStart + 1, innerEnd - 1);
    // Count top-level commas in argsRaw
    let d3 = 0, count = 0, token = '';
    for (let k = 0; k < argsRaw.length; k++) {
      const ch = argsRaw[k];
      if (ch === '[') d3++;
      else if (ch === ']') d3--;
      if (ch === ',' && d3 === 0) { if (token.trim()) count++; token = ''; }
      else token += ch;
    }
    if (token.trim()) count++;
    results.push({ name, valid: true, args: count });
  }
  const map = new Map(results.map(r => [r.name, r]));
  return { list: results, map };
}

(function main() {
  const args = parseArgs(process.argv);
  const jsonPath = args._[0] || '/tmp/ffi.json';
  const data = loadJson(jsonPath);
  const exports = new Set(data.exports_source || []);

  const featuresMapPath = args.featuresMap || path.resolve(__dirname, 'features-map.json');
  const featuresMap = fs.existsSync(featuresMapPath) ? loadJson(featuresMapPath) : {};
  const featurePatterns = compileFeaturePatterns(featuresMap);
  const bits = args.lib ? readFeatureBitsFromLib(args.lib) : null;

  const required = [];
  for (const name of exports) {
    const feat = featureForExport(name, featurePatterns);
    if (!feat) { required.push(name); continue; }
    if (bits == null) { required.push(name); continue; }
    if (isBitSet(bits, feat)) required.push(name);
  }

  const nativeSrc = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'native.ts'), 'utf8');
  const { list: declaredList, map: declaredMap } = parseDeclaredFromNativeTs(nativeSrc);
  const declaredNames = new Set(declaredList.map(x => x.name));

  const allow = loadAllowlist(args.allow);
  const missing = required.filter(x => !declaredNames.has(x) && !allow.has(x)).sort();
  const extra = [...declaredNames].filter(x => !exports.has(x)).sort();
  const invalid = declaredList.filter(x => !x.valid).map(x => x.name).sort();

  const report = {
    exports: exports.size,
    required: required.length,
    declared: declaredNames.size,
    missing,
    extra,
    invalid,
    feature_bits: bits,
    features_map_used: Object.keys(featuresMap),
  };

  console.log(`Exports: ${report.exports}`);
  console.log(`Required (after feature gating): ${report.required}`);
  console.log(`Declared: ${report.declared}`);
  console.log(`Missing: ${report.missing.length}`);
  if (report.missing.length) console.log(report.missing.join('\n'));
  console.log(`Invalid declarations: ${report.invalid.length}`);
  if (report.invalid.length) console.log(report.invalid.join('\n'));
  console.log(`Extra (declared but not in exports): ${report.extra.length}`);
  if (report.extra.length) console.log(report.extra.join('\n'));

  if (args.out) fs.writeFileSync(args.out, JSON.stringify(report, null, 2));

  if (report.missing.length || report.invalid.length) process.exit(1);
})();
