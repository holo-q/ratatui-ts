import ref from 'ref-napi';
import {
  Terminal, Paragraph, Gauge, Tabs, BarChart, Sparkline, Chart,
  LineGauge, Canvas, rect, widgetKind, FrameBuilder,
  headlessRenderFrame, headlessRenderFrameStylesEx, headlessRenderFrameCells,
  layoutSplitPercentages, direction, colorHelper, styleMods,
} from '../src';

// Compose a representative scene and render headless for quick validation.

function demo() {
  const width = 60, height = 20;

  const p = Paragraph.fromText('Hello ratatui-ts!');
  p.setBlockTitle('Demo', true);

  const g = new Gauge();
  g.setRatio(0.42);
  g.setLabel('42%');

  const lg = new LineGauge();
  lg.setRatio(0.65).setLabel('65%');

  const bc = new BarChart();
  bc.setValues([5n, 10n, 7n, 3n]);
  bc.setLabels(['A', 'B', 'C', 'D']);

  const sp = new Sparkline();
  sp.setValues([1,3,2,5,4,6]);

  const ch = new Chart();
  ch.addLine('line', [[0,0],[1,1],[2,0.2],[3,1.2]]);
  ch.setAxesTitles('x','y');

  const cv = new Canvas(-1, 1, -1, 1);
  cv.addLine(-1,-1, 1,1, { fg: colorHelper.rgb(255, 200, 0), mods: styleMods.Bold });
  cv.addRect(-0.5,-0.2, 1.0,0.7, { fg: colorHelper.idx(4) }, false);

  const rects = layoutSplitPercentages(width, height, direction.Vertical, [3,3,6,8], 0, 0, 0, 0, 0);
  const fb = new FrameBuilder()
    .add(widgetKind.Paragraph, (p as any).ptr, rects[0])
    .add(widgetKind.Gauge, (g as any).ptr, rects[1])
    .add(widgetKind.Chart, (ch as any).ptr, rects[2])
    .add(widgetKind.Canvas, (cv as any).ptr, rects[3]);

  const cmds = fb.toArray();
  const text = headlessRenderFrame(width, height, cmds);
  const styles = headlessRenderFrameStylesEx(width, height, cmds);
  const cells = headlessRenderFrameCells(width, height, cmds);

  console.log(text);
  console.log('\n--- styles_ex ---');
  console.log(styles.slice(0, 200) + '...');
  console.log('\n--- cells sample ---');
  console.log(cells.slice(0, 10));

  // Free resources explicitly (optional; FinalizationRegistry would also clean up)
  (p as any).free?.();
  (g as any).free?.();
  (lg as any).free?.();
  (bc as any).free?.();
  (sp as any).free?.();
  (ch as any).free?.();
  (cv as any).free?.();
}

demo();

