#!/usr/bin/env node
/*
 Simple interactive demo using ratatui-ts.
 Controls:
 - q or Esc: quit
 - Left/Right: switch tab
 - Up/Down: move selection in the list/table
*/
import { Terminal, Paragraph, List, Table, Gauge, Tabs, Chart, rect, widgetKind, FrameBuilder, eventKind, key } from '../index';

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function main() {
  const term = Terminal.init();
  try {
    let running = true;
    let tabIdx = 0;
    let tick = 0;
    let sel = 0;

    const tabs = new Tabs();
    tabs.setTitles([ 'Overview', 'List', 'Table', 'Chart' ]);

    const list = new List();
    list.setBlockTitle('List', true);
    for (let i = 0; i < 20; i++) list.appendItem(`Item ${i+1}`, {});

    const table = new Table();
    table.setBlockTitle('Table', true);
    table.setHeaders(['A','B']);
    for (let i = 0; i < 10; i++) table.appendRow([`r${i}c1`,`r${i}c2`]);

    const chart = new Chart();
    chart.setAxesTitles('x','y');

    while (running) {
      const size = term.size();
      const w = size?.width ?? 80;
      const h = size?.height ?? 24;

      // Update chart data
      chart.addLine('L', [[0,1],[1,Math.sin(tick/5)+1],[2,1+Math.cos(tick/7)]], {});

      const header = Paragraph.fromText('ratatui-ts demo — q to quit');
      header.setBlockTitle('Header', true);

      tabs.setSelected(tabIdx);

      const fb = new FrameBuilder()
        .add(widgetKind.Paragraph, (header as any).ptr, rect(0,0,w,3))
        .add(widgetKind.Tabs, (tabs as any).ptr, rect(0,3,w,3));

      const bodyTop = 6;
      if (tabIdx === 0) {
        const g = new Gauge();
        g.setRatio(((tick % 100) / 100));
        g.setBlockTitle('Load', true);
        fb.add(widgetKind.Gauge, (g as any).ptr, rect(0, bodyTop, w, 1));
        (g as any).free?.();
      } else if (tabIdx === 1) {
        list.setSelected(sel);
        fb.add(widgetKind.List, (list as any).ptr, rect(0, bodyTop, w, h - bodyTop));
      } else if (tabIdx === 2) {
        table.setSelected(sel);
        fb.add(widgetKind.Table, (table as any).ptr, rect(0, bodyTop, w, h - bodyTop));
      } else if (tabIdx === 3) {
        fb.add(widgetKind.Chart, (chart as any).ptr, rect(0, bodyTop, w, h - bodyTop));
      }

      term.drawFrame(fb.toArray());
      (header as any).free?.();

      // Poll events
      const evt = Terminal.nextEvent(100);
      if (evt && evt.kind === eventKind.Key) {
        const ch = evt.key.ch;
        if (ch === 'q'.charCodeAt(0) || evt.key.code === key.Esc) { running = false; }
        else if (evt.key.code === key.Left) { tabIdx = (tabIdx + 3) % 4; }
        else if (evt.key.code === key.Right) { tabIdx = (tabIdx + 1) % 4; }
        else if (evt.key.code === key.Up) { sel = clamp(sel - 1, 0, 99); }
        else if (evt.key.code === key.Down) { sel = clamp(sel + 1, 0, 99); }
      }
      tick++;
    }

    // Clean up long-lived widgets
    (tabs as any).free?.();
    (list as any).free?.();
    (table as any).free?.();
    (chart as any).free?.();
  } finally {
    term.free();
  }
}

if (require.main === module) main();

