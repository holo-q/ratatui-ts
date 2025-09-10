import { Paragraph, List, Tabs, Table, Chart, BarChart, Sparkline, rect, Align } from '../src';
import { headlessRender, headlessRenderList, headlessRenderTabs, headlessRenderTable, headlessRenderChart, headlessRenderBarChart, headlessRenderSparkline } from '../src';

function spans(texts: string[]) {
  return texts.map(t => ({ text: t }));
}

function run() {
  // Paragraph with line spans and alignment
  const p = Paragraph.fromText('');
  p.setBlockTitle('Batch Paragraph', true);
  p.setBlockTitleAlignment(Align.Center);
  p.appendLinesSpans([
    spans(['hello ', 'world']),
    spans(['line ', 'two']),
  ]);
  console.log('Paragraph:\n' + headlessRender(30, 3, p));

  // List with batch items spans
  const lst = new List();
  lst.setBlockTitle('Items', true);
  lst.appendItemsSpans([
    spans(['one', ' ', 'two']),
    spans(['three']),
    spans(['four'])
  ]);
  console.log('\nList:\n' + headlessRenderList(20, 4, lst));

  // Tabs with spans titles
  const tabs = new Tabs();
  tabs.setBlockTitle('Tabs', true);
  tabs.setTitlesSpans([
    spans(['Tab', ' A']),
    spans(['Tab', ' B']),
    spans(['Tab', ' C']),
  ]);
  console.log('\nTabs:\n' + headlessRenderTabs(20, 3, tabs));

  // Table: headers spans and rows with multiline cells
  const tbl = new Table();
  tbl.setBlockTitle('Table', true);
  tbl.setHeadersSpans([spans(['H1']), spans(['H2'])]);
  tbl.appendRowCellsLines([
    [spans(['r1c1a']), spans(['r1c2a'])],
  ]);
  tbl.appendRowsCellsLines([
    [ [spans(['r2c1a']), spans(['r2c1b'])], [spans(['r2c2'])] ],
  ]);
  console.log('\nTable:\n' + headlessRenderTable(24, 4, tbl));

  // Chart with x/y label spans
  const ch = new Chart();
  ch.addLine('L', [[0,1],[1,0.5],[2,1.2]]);
  ch.setXLabelsSpans([spans(['x1']), spans(['x2'])]);
  ch.setYLabelsSpans([spans(['y1']), spans(['y2'])]);
  console.log('\nChart:\n' + headlessRenderChart(30, 6, ch));

  // BarChart + Sparkline
  const bc = new BarChart();
  bc.setLabels(['A','B','C']);
  bc.setValues([3,6,2]);
  console.log('\nBarChart:\n' + headlessRenderBarChart(20, 4, bc));

  const sp = new Sparkline();
  sp.setValues([1,3,2,5,4,6]);
  console.log('\nSparkline:\n' + headlessRenderSparkline(20, 1, sp));
}

run();

