#!/usr/bin/env node
/*
 Generates ASCII snapshots for README/docs from headless rendering.
 Requires:
  - RATATUI_FFI_PATH set to native libratatui_ffi (.so/.dylib/.dll)
  - Built JS (npm run build) so we can require dist/cjs/index.js
*/
const fs = require('fs');
const path = require('path');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function writeText(p, s) { fs.writeFileSync(p, s, 'utf8'); }

function load() {
  const mod = require('../dist/cjs/index.js');
  return mod;
}

function scene_basic(mod) {
  const { Paragraph, rect, widgetKind, FrameBuilder, headlessRenderFrame } = mod;
  const p = Paragraph.fromText('Hello from ratatui-ts!');
  p.setBlockTitle('Paragraph', true);
  const fb = new FrameBuilder().add(widgetKind.Paragraph, p.ptr, rect(0, 0, 40, 3));
  const txt = headlessRenderFrame(40, 3, fb.toArray());
  p.free?.();
  return txt;
}

function scene_table(mod) {
  const { Table, rect, widgetKind, FrameBuilder, headlessRenderFrame } = mod;
  const t = new Table();
  t.setBlockTitle('Table', true);
  t.setHeaders(['A','B']);
  t.appendRow(['1','2']);
  t.appendRow(['3','4']);
  const fb = new FrameBuilder().add(widgetKind.Table, t.ptr, rect(0,0,40,6));
  const txt = headlessRenderFrame(40,6, fb.toArray());
  t.free?.();
  return txt;
}

function scene_chart(mod) {
  const { Chart, rect, widgetKind, FrameBuilder, headlessRenderFrame } = mod;
  const c = new Chart();
  c.addLine('L', [[0,1],[1,0.5],[2,1.2]]);
  c.setAxesTitles('x','y');
  const fb = new FrameBuilder().add(widgetKind.Chart, c.ptr, rect(0,0,40,10));
  const txt = headlessRenderFrame(40,10, fb.toArray());
  c.free?.();
  return txt;
}

function scene_combined(mod) {
  const { Paragraph, Gauge, Chart, rect, widgetKind, FrameBuilder, headlessRenderFrame } = mod;
  const p = Paragraph.fromText('Combined'); p.setBlockTitle('P', true);
  const g = new Gauge(); g.setRatio(0.42); g.setBlockTitle('G', true);
  const c = new Chart(); c.addLine('L', [[0,1],[1,0.5],[2,1.2]]);
  const fb = new FrameBuilder()
    .add(widgetKind.Paragraph, p.ptr, rect(0,0,40,3))
    .add(widgetKind.Gauge, g.ptr, rect(0,3,40,1))
    .add(widgetKind.Chart, c.ptr, rect(0,4,40,8));
  const txt = headlessRenderFrame(40,12, fb.toArray());
  p.free?.(); g.free?.(); c.free?.();
  return txt;
}

function main() {
  const outDir = path.resolve(__dirname, '..', 'docs', 'assets', 'snapshots');
  ensureDir(outDir);
  const mod = load();
  const scenes = [
    ['paragraph.txt', scene_basic],
    ['table.txt', scene_table],
    ['chart.txt', scene_chart],
    ['combined.txt', scene_combined],
  ];
  for (const [name, fn] of scenes) {
    const txt = fn(mod);
    writeText(path.join(outDir, name), txt);
    console.log('wrote', name);
  }
}

if (require.main === module) {
  main();
}
