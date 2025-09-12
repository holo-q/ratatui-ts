import ref from 'ref-napi';
const ArrayType = require('ref-array-di')(ref);
import { loadLibrary, FfiStyle as FfiStyleT, FfiRect as FfiRectT, FfiEvent as FfiEventT, FfiDrawCmd as FfiDrawCmdT, FfiDrawCmdArray, U64Array, F64Array, charPtr, makeOptionalForeign } from './native';
import { FfiStyle, FfiRect, FfiEvent, FfiDrawCmd, FfiCellInfo, FfiSpan, FfiLineSpans, FfiCellLines, FfiRowCellsLines } from './native';
export { Align } from './native';

// enums mirroring the Rust/C ABI
export const color = {
  Reset: 0,
  Black: 1,
  Red: 2,
  Green: 3,
  Yellow: 4,
  Blue: 5,
  Magenta: 6,
  Cyan: 7,
  Gray: 8,
  DarkGray: 9,
  LightRed: 10,
  LightGreen: 11,
  LightYellow: 12,
  LightBlue: 13,
  LightMagenta: 14,
  LightCyan: 15,
  White: 16,
} as const;

export const styleMods = {
  None: 0,
  Bold: 1 << 0,
  Italic: 1 << 1,
  Underline: 1 << 2,
  Dim: 1 << 3,
  Crossed: 1 << 4,
  Reversed: 1 << 5,
  RapidBlink: 1 << 6,
  SlowBlink: 1 << 7,
} as const;

export const key = {
  Char: 0,
  Enter: 1,
  Left: 2,
  Right: 3,
  Up: 4,
  Down: 5,
  Esc: 6,
  Backspace: 7,
  Tab: 8,
  Delete: 9,
  Home: 10,
  End: 11,
  PageUp: 12,
  PageDown: 13,
  Insert: 14,
  F1: 100,
  // F2..F12 follow sequentially
} as const;

export type KeyCode =
  | typeof key.Char | typeof key.Enter | typeof key.Left | typeof key.Right
  | typeof key.Up | typeof key.Down | typeof key.Esc | typeof key.Backspace
  | typeof key.Tab | typeof key.Delete | typeof key.Home | typeof key.End
  | typeof key.PageUp | typeof key.PageDown | typeof key.Insert
  | 100 | 101 | 102 | 103 | 104 | 105 | 106 | 107 | 108 | 109 | 110 | 111; // F1..F12

export type KeyEvent = {
  kind: typeof eventKind.Key;
  key: { code: KeyCode; ch: number; mods: number };
};

export type ResizeEvent = {
  kind: typeof eventKind.Resize;
  width: number;
  height: number;
};

export type MouseEvent = {
  kind: typeof eventKind.Mouse;
  mouse_x: number;
  mouse_y: number;
  mouse_kind: number;
  mouse_btn: number;
  mouse_mods: number;
};

export type NoneEvent = { kind: typeof eventKind.None };
export type Event = KeyEvent | ResizeEvent | MouseEvent | NoneEvent;

export const eventKind = {
  None: 0,
  Key: 1,
  Resize: 2,
  Mouse: 3,
} as const;

export const mouseKind = {
  Down: 1,
  Up: 2,
  Drag: 3,
  Moved: 4,
  ScrollUp: 5,
  ScrollDown: 6,
} as const;

export const mouseButton = {
  None: 0,
  Left: 1,
  Right: 2,
  Middle: 3,
} as const;

export type Style = Readonly<{ fg?: number; bg?: number; mods?: number }>;

function toFfiStyle(s?: Style): FfiStyleT {
  const st = new FfiStyle({
    fg: s?.fg ?? 0,
    bg: s?.bg ?? 0,
    mods: s?.mods ?? 0,
  });
  return st;
}

export function rect(x: number, y: number, width: number, height: number): FfiRectT {
  return new FfiRect({ x, y, width, height });
}

const lib = loadLibrary();

// ---- Version and feature bits ----
export function getVersion(): { major: number; minor: number; patch: number } {
  const maj = ref.alloc('uint32');
  const min = ref.alloc('uint32');
  const pat = ref.alloc('uint32');
  try { (lib as any).ratatui_ffi_version(maj, min, pat); } catch {}
  return { major: maj.deref(), minor: min.deref(), patch: pat.deref() };
}
export function getFeatureBits(): number {
  try { return (lib as any).ratatui_ffi_feature_bits(); } catch { return 0; }
}

// ---- Color helpers ----
export const colorHelper = {
  rgb(r: number, g: number, b: number): number { return (lib as any).ratatui_color_rgb(r, g, b); },
  idx(i: number): number { return (lib as any).ratatui_color_indexed(i); },
};

// Resource finalizers
const paragraphRegistry = new FinalizationRegistry<Buffer>((ptr) => {
  try { lib.ratatui_paragraph_free(ptr); } catch { /* ignore */ }
});
const terminalRegistry = new FinalizationRegistry<Buffer>((ptr) => {
  try { lib.ratatui_terminal_free(ptr); } catch { /* ignore */ }
});

export class Paragraph {
  private ptr: Buffer;
  private token: object;

  private constructor(ptr: Buffer) {
    this.ptr = ptr;
    this.token = {};
    paragraphRegistry.register(this, ptr, this.token);
  }

  static fromText(text: string): Paragraph {
    const p = lib.ratatui_paragraph_new(text);
    if (ref.isNull(p)) throw new Error('ratatui_paragraph_new returned null');
    return new Paragraph(p);
  }

  setBlockTitle(title: string | null, showBorder: boolean): void {
    lib.ratatui_paragraph_set_block_title(this.ptr, title ?? ref.NULL, showBorder);
  }
  setBlockTitleAlignment(align: number): void { (lib as any).ratatui_paragraph_set_block_title_alignment(this.ptr, align); }
  setBlockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: Array<{text:string; style?: Style}>) {
    const built = buildSpans(titleSpans);
    try { (lib as any).ratatui_paragraph_set_block_adv(this.ptr, bordersBits, borderType, padL, padT, padR, padB, built.ptr, built.len); } finally { built.free(); }
  }

  appendLine(text: string, style?: Style): void {
    const st = toFfiStyle(style);
    lib.ratatui_paragraph_append_line(this.ptr, text, st);
  }
  appendSpans(spans: Array<{ text: string; style?: Style }>): void {
    const built = buildSpans(spans);
    try { (lib as any).ratatui_paragraph_append_spans(this.ptr, built.ptr, built.len); } finally { built.free(); }
  }
  appendLineSpans(spans: Array<{ text: string; style?: Style }>) {
    const built = buildSpans(spans);
    try { (lib as any).ratatui_paragraph_append_line_spans(this.ptr, built.ptr, built.len); } finally { built.free(); }
  }
  appendLinesSpans(lines: Array<Array<{ text: string; style?: Style }>>) {
    const built = buildLineSpans(lines);
    try { (lib as any).ratatui_paragraph_append_lines_spans(this.ptr, built.ptr, built.len); } finally { built.free(); }
  }
  appendSpan(text: string, style?: Style) { (lib as any).ratatui_paragraph_append_span(this.ptr, text, toFfiStyle(style)); }
  lineBreak() { (lib as any).ratatui_paragraph_line_break(this.ptr); }
  reserveLines(additional: number) { (lib as any).ratatui_paragraph_reserve_lines(this.ptr, additional); }
  setAlignment(align: number) { (lib as any).ratatui_paragraph_set_alignment(this.ptr, align); }
  setWrap(trim: boolean) { (lib as any).ratatui_paragraph_set_wrap(this.ptr, trim); }
  setScroll(x: number, y: number) { (lib as any).ratatui_paragraph_set_scroll(this.ptr, x, y); }
  setStyle(style?: Style) { (lib as any).ratatui_paragraph_set_style(this.ptr, toFfiStyle(style)); }

  get handle(): Buffer { return this.ptr; }

  free(): void {
    if (!ref.isNull(this.ptr)) {
      lib.ratatui_paragraph_free(this.ptr);
      paragraphRegistry.unregister(this.token);
      // mark as null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).ptr = ref.NULL;
    }
  }
}

export class Terminal {
  private ptr: Buffer;
  private token: object;

  private constructor(ptr: Buffer) {
    this.ptr = ptr;
    this.token = {};
    terminalRegistry.register(this, ptr, this.token);
  }

  static init(): Terminal {
    const t = lib.ratatui_init_terminal();
    if (ref.isNull(t)) throw new Error('ratatui_init_terminal failed');
    return new Terminal(t);
  }

  clear(): void {
    lib.ratatui_terminal_clear(this.ptr);
  }

  size(): { width: number; height: number } | null {
    const wRef = ref.alloc('uint16');
    const hRef = ref.alloc('uint16');
    const ok = lib.ratatui_terminal_size(wRef, hRef);
    if (!ok) return null;
    return { width: wRef.deref(), height: hRef.deref() };
  }

  drawParagraph(p: Paragraph): boolean {
    return !!lib.ratatui_terminal_draw_paragraph(this.ptr, p.handle);
  }

  drawParagraphIn(p: Paragraph, r: FfiRectT): boolean {
    return !!lib.ratatui_terminal_draw_paragraph_in(this.ptr, p.handle, r);
  }

  // Other widgets
  drawListIn(lst: List, r: FfiRectT): boolean { return !!lib.ratatui_terminal_draw_list_in(this.ptr, lst.handle, r); }
  drawTableIn(tbl: Table, r: FfiRectT): boolean { return !!lib.ratatui_terminal_draw_table_in(this.ptr, tbl.handle, r); }
  drawGaugeIn(g: Gauge, r: FfiRectT): boolean { return !!lib.ratatui_terminal_draw_gauge_in(this.ptr, g.handle, r); }
  drawTabsIn(tabs: Tabs, r: FfiRectT): boolean { return !!lib.ratatui_terminal_draw_tabs_in(this.ptr, tabs.handle, r); }
  drawBarChartIn(bc: BarChart, r: FfiRectT): boolean { return !!lib.ratatui_terminal_draw_barchart_in(this.ptr, bc.handle, r); }
  drawSparklineIn(sp: Sparkline, r: FfiRectT): boolean { return !!lib.ratatui_terminal_draw_sparkline_in(this.ptr, sp.handle, r); }
  drawChartIn(ch: Chart, r: FfiRectT): boolean { return !!lib.ratatui_terminal_draw_chart_in(this.ptr, ch.handle, r); }

  static nextEvent(timeoutMs: number): Event | null {
    const evt = new FfiEvent();
    const ok = lib.ratatui_next_event(timeoutMs, evt.ref());
    if (!ok) return null;
    switch (evt.kind) {
      case eventKind.Key:
        return { kind: eventKind.Key, key: { code: evt.key.code as KeyCode, ch: evt.key.ch, mods: evt.key.mods } };
      case eventKind.Resize:
        return { kind: eventKind.Resize, width: evt.width, height: evt.height };
      case eventKind.Mouse:
        return { kind: eventKind.Mouse, mouse_x: evt.mouse_x, mouse_y: evt.mouse_y, mouse_kind: evt.mouse_kind, mouse_btn: evt.mouse_btn, mouse_mods: evt.mouse_mods };
      default:
        return { kind: eventKind.None };
    }
  }

  free(): void {
    if (!ref.isNull(this.ptr)) {
      lib.ratatui_terminal_free(this.ptr);
      terminalRegistry.unregister(this.token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).ptr = ref.NULL;
    }
  }
}

// Headless rendering convenience
export function headlessRender(width: number, height: number, p: Paragraph): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_paragraph(width, height, p.handle, outPtr);
  if (!ok) throw new Error('headless_render_paragraph failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderList(width: number, height: number, l: List): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_list(width, height, l.handle, outPtr);
  if (!ok) throw new Error('headless_render_list failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderTable(width: number, height: number, t: Table): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_table(width, height, t.handle, outPtr);
  if (!ok) throw new Error('headless_render_table failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderGauge(width: number, height: number, g: Gauge): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_gauge(width, height, g.handle, outPtr);
  if (!ok) throw new Error('headless_render_gauge failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderTabs(width: number, height: number, t: Tabs): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_tabs(width, height, t.handle, outPtr);
  if (!ok) throw new Error('headless_render_tabs failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderBarChart(width: number, height: number, b: BarChart): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_barchart(width, height, b.handle, outPtr);
  if (!ok) throw new Error('headless_render_barchart failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderSparkline(width: number, height: number, s: Sparkline): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_sparkline(width, height, s.handle, outPtr);
  if (!ok) throw new Error('headless_render_sparkline failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderChart(width: number, height: number, c: Chart): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer;
  const ok = (lib as any).ratatui_headless_render_chart(width, height, c.handle, outPtr);
  if (!ok) throw new Error('headless_render_chart failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderClear(width: number, height: number): string {
  const outPtr = ref.alloc(charPtr) as unknown as Buffer;
  const ok = (lib as any).ratatui_headless_render_clear(width, height, outPtr);
  if (!ok) throw new Error('headless_render_clear failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

// (headlessRenderChart declared above)

export type { FfiRectT as FfiRect, FfiEventT as RawEvent };

// -------- Additional Widgets --------

export class List {
  private ptr: Buffer;
  private token: object;
  constructor() {
    this.ptr = lib.ratatui_list_new();
    if (ref.isNull(this.ptr)) throw new Error('ratatui_list_new failed');
    this.token = {};
    listRegistry.register(this, this.ptr, this.token);
  }
  appendItem(text: string, style?: Style) {
    lib.ratatui_list_append_item(this.ptr, text, toFfiStyle(style));
  }
  appendItemSpans(spans: Array<{ text: string; style?: Style }>) {
    const built = buildSpans(spans);
    try { (lib as any).ratatui_list_append_item_spans(this.ptr, built.ptr, built.len); } finally { built.free(); }
  }
  appendItemsSpans(lines: Array<Array<{ text: string; style?: Style }>>) {
    const built = buildLineSpans(lines);
    try { (lib as any).ratatui_list_append_items_spans(this.ptr, built.ptr, built.len); } finally { built.free(); }
  }
  reserveItems(additional: number) { (lib as any).ratatui_list_reserve_items(this.ptr, additional); }
  setBlockTitle(title: string | null, showBorder: boolean) {
    lib.ratatui_list_set_block_title(this.ptr, title ?? ref.NULL, showBorder);
  }
  setBlockTitleAlignment(align: number) { (lib as any).ratatui_list_set_block_title_alignment(this.ptr, align); }
  setBlockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: Array<{text:string; style?: Style}>) {
    const built = buildSpans(titleSpans);
    try { (lib as any).ratatui_list_set_block_adv(this.ptr, bordersBits, borderType, padL, padT, padR, padB, built.ptr, built.len); } finally { built.free(); }
  }
  setSelected(index: number | null) {
    lib.ratatui_list_set_selected(this.ptr, index == null ? -1 : index);
  }
  setHighlightStyle(style?: Style) {
    lib.ratatui_list_set_highlight_style(this.ptr, toFfiStyle(style));
  }
  setHighlightSymbol(symbol: string | null) {
    lib.ratatui_list_set_highlight_symbol(this.ptr, symbol ?? ref.NULL);
  }
  setHighlightSpacing(kind: number) { (lib as any).ratatui_list_set_highlight_spacing(this.ptr, kind); }
  setDirection(dir: number) { (lib as any).ratatui_list_set_direction(this.ptr, dir); }
  setScrollOffset(off: number) { (lib as any).ratatui_list_set_scroll_offset(this.ptr, off); }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_list_free(this.ptr); listRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

export class Table {
  private ptr: Buffer;
  private token: object;
  constructor() {
    this.ptr = lib.ratatui_table_new();
    if (ref.isNull(this.ptr)) throw new Error('ratatui_table_new failed');
    this.token = {};
    tableRegistry.register(this, this.ptr, this.token);
  }
  setHeaders(headers: string[]) { lib.ratatui_table_set_headers(this.ptr, headers.join('\t')); }
  setHeadersSpans(lines: Array<Array<{ text: string; style?: Style }>>) { const built = buildLineSpans(lines); try { (lib as any).ratatui_table_set_headers_spans(this.ptr, built.ptr, built.len); } finally { built.free(); } }
  appendRow(cells: string[]) { lib.ratatui_table_append_row(this.ptr, cells.join('\t')); }
  appendRowSpans(cells: Array<Array<{ text: string; style?: Style }>>) { const built = buildLineSpans(cells); try { (lib as any).ratatui_table_append_row_spans(this.ptr, built.ptr, built.len); } finally { built.free(); } }
  appendRowCellsLines(cells: Array<Array<Array<{ text: string; style?: Style }>>>) { const built = buildCellsLines(cells); try { (lib as any).ratatui_table_append_row_cells_lines(this.ptr, built.ptr, built.len); } finally { built.free(); } }
  appendRowsCellsLines(rows: Array<Array<Array<Array<{ text: string; style?: Style }>>>>) { const built = buildRowsCellsLines(rows); try { (lib as any).ratatui_table_append_rows_cells_lines(this.ptr, built.ptr, built.len); } finally { built.free(); } }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_table_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
  setBlockTitleAlignment(align: number) { (lib as any).ratatui_table_set_block_title_alignment(this.ptr, align); }
  setBlockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: Array<{text:string; style?: Style}>) {
    const built = buildSpans(titleSpans);
    try { (lib as any).ratatui_table_set_block_adv(this.ptr, bordersBits, borderType, padL, padT, padR, padB, built.ptr, built.len); } finally { built.free(); }
  }
  setSelected(index: number | null) { lib.ratatui_table_set_selected(this.ptr, index == null ? -1 : index); }
  setRowHighlightStyle(style?: Style) { lib.ratatui_table_set_row_highlight_style(this.ptr, toFfiStyle(style)); }
  setHighlightSymbol(symbol: string | null) { lib.ratatui_table_set_highlight_symbol(this.ptr, symbol ?? ref.NULL); }
  setHeaderStyle(style?: Style) { (lib as any).ratatui_table_set_header_style(this.ptr, toFfiStyle(style)); }
  setRowHeight(h: number) { (lib as any).ratatui_table_set_row_height(this.ptr, h); }
  setColumnSpacing(sp: number) { (lib as any).ratatui_table_set_column_spacing(this.ptr, sp); }
  setColumnHighlightStyle(style?: Style) { (lib as any).ratatui_table_set_column_highlight_style(this.ptr, toFfiStyle(style)); }
  setCellHighlightStyle(style?: Style) { (lib as any).ratatui_table_set_cell_highlight_style(this.ptr, toFfiStyle(style)); }
  setHighlightSpacing(kind: number) { (lib as any).ratatui_table_set_highlight_spacing(this.ptr, kind); }
  setWidthsPercentages(pcts: number[]) { const U16Arr = ArrayType(ref.types.uint16, pcts.length); const buf = new U16Arr(pcts); (lib as any).ratatui_table_set_widths_percentages(this.ptr, buf, pcts.length); }
  setWidths(constraints: Array<{ kind: 'Percentage'|'Length'|'Min'; value: number }>) { const kinds = constraints.map(toConstraintKind); const vals = constraints.map(c => c.value|0); const U32Arr = ArrayType(ref.types.uint32, kinds.length); const U16Arr = ArrayType(ref.types.uint16, vals.length); const kbuf = new U32Arr(kinds); const vbuf = new U16Arr(vals); (lib as any).ratatui_table_set_widths(this.ptr, kbuf, vbuf, kinds.length); }
  reserveRows(n: number){ (lib as any).ratatui_table_reserve_rows(this.ptr, n); }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_table_free(this.ptr); tableRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

export class Gauge {
  private ptr: Buffer; private token: object;
  constructor() { this.ptr = lib.ratatui_gauge_new(); if (ref.isNull(this.ptr)) throw new Error('ratatui_gauge_new failed'); this.token = {}; gaugeRegistry.register(this, this.ptr, this.token); }
  setRatio(ratio: number) { lib.ratatui_gauge_set_ratio(this.ptr, ratio); }
  setLabel(label: string | null) { lib.ratatui_gauge_set_label(this.ptr, label ?? ref.NULL); }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_gauge_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
  setBlockTitleAlignment(align: number) { (lib as any).ratatui_gauge_set_block_title_alignment(this.ptr, align); }
  setStyles(style?: Style, labelStyle?: Style, gaugeStyle?: Style) { (lib as any).ratatui_gauge_set_styles(this.ptr, toFfiStyle(style), toFfiStyle(labelStyle), toFfiStyle(gaugeStyle)); }
  setBlockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: Array<{text:string; style?: Style}>) {
    const built = buildSpans(titleSpans);
    try { (lib as any).ratatui_gauge_set_block_adv(this.ptr, bordersBits, borderType, padL, padT, padR, padB, built.ptr, built.len); } finally { built.free(); }
  }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_gauge_free(this.ptr); gaugeRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

export class Tabs {
  private ptr: Buffer; private token: object;
  constructor() { this.ptr = lib.ratatui_tabs_new(); if (ref.isNull(this.ptr)) throw new Error('ratatui_tabs_new failed'); this.token = {}; tabsRegistry.register(this, this.ptr, this.token); }
  setTitles(titles: string[]) { lib.ratatui_tabs_set_titles(this.ptr, titles.join('\t')); }
  clearTitles(){ (lib as any).ratatui_tabs_clear_titles(this.ptr); }
  addTitleSpans(spans: Array<{ text: string; style?: Style }>) { const built = buildSpans(spans); try { (lib as any).ratatui_tabs_add_title_spans(this.ptr, built.ptr, built.len); } finally { built.free(); } }
  setTitlesSpans(lines: Array<Array<{ text: string; style?: Style }>>) { const built = buildLineSpans(lines); try { (lib as any).ratatui_tabs_set_titles_spans(this.ptr, built.ptr, built.len); } finally { built.free(); } }
  setSelected(i: number) { lib.ratatui_tabs_set_selected(this.ptr, i); }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_tabs_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
  setBlockTitleAlignment(align: number) { (lib as any).ratatui_tabs_set_block_title_alignment(this.ptr, align); }
  setBlockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: Array<{text:string; style?: Style}>) {
    const built = buildSpans(titleSpans);
    try { (lib as any).ratatui_tabs_set_block_adv(this.ptr, bordersBits, borderType, padL, padT, padR, padB, built.ptr, built.len); } finally { built.free(); }
  }
  setStyles(unselected: Style, selected: Style) { (lib as any).ratatui_tabs_set_styles(this.ptr, toFfiStyle(unselected), toFfiStyle(selected)); }
  setDivider(div: string) { (lib as any).ratatui_tabs_set_divider(this.ptr, div); }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_tabs_free(this.ptr); tabsRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

export class BarChart {
  private ptr: Buffer; private token: object;
  constructor() { this.ptr = lib.ratatui_barchart_new(); if (ref.isNull(this.ptr)) throw new Error('ratatui_barchart_new failed'); this.token = {}; barChartRegistry.register(this, this.ptr, this.token); }
  setValues(values: Array<number | bigint>) {
    // BigInt-safe marshalling into a contiguous u64 buffer
    const buf = Buffer.alloc(values.length * 8);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const bi = typeof v === 'bigint' ? v : BigInt(v);
      buf.writeBigUInt64LE(bi, i * 8);
    }
    lib.ratatui_barchart_set_values(this.ptr, buf, values.length);
  }
  setLabels(labels: string[]) { lib.ratatui_barchart_set_labels(this.ptr, labels.join('\t')); }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_barchart_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
  setBarWidth(w: number){ (lib as any).ratatui_barchart_set_bar_width(this.ptr, w); }
  setBarGap(g: number){ (lib as any).ratatui_barchart_set_bar_gap(this.ptr, g); }
  setStyles(bar?: Style, value?: Style, label?: Style){ (lib as any).ratatui_barchart_set_styles(this.ptr, toFfiStyle(bar), toFfiStyle(value), toFfiStyle(label)); }
  setBlockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: Array<{text:string; style?: Style}>) {
    const built = buildSpans(titleSpans);
    try { (lib as any).ratatui_barchart_set_block_adv(this.ptr, bordersBits, borderType, padL, padT, padR, padB, built.ptr, built.len); } finally { built.free(); }
  }
  setBlockTitleAlignment(align: number){ (lib as any).ratatui_barchart_set_block_title_alignment(this.ptr, align); }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_barchart_free(this.ptr); barChartRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

export class Sparkline {
  private ptr: Buffer; private token: object;
  constructor() { this.ptr = lib.ratatui_sparkline_new(); if (ref.isNull(this.ptr)) throw new Error('ratatui_sparkline_new failed'); this.token = {}; sparklineRegistry.register(this, this.ptr, this.token); }
  setValues(values: Array<number | bigint>) {
    const buf = Buffer.alloc(values.length * 8);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const bi = typeof v === 'bigint' ? v : BigInt(v);
      buf.writeBigUInt64LE(bi, i * 8);
    }
    lib.ratatui_sparkline_set_values(this.ptr, buf, values.length);
  }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_sparkline_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
  setMax(max: number){ (lib as any).ratatui_sparkline_set_max(this.ptr, max); }
  setStyle(style?: Style){ (lib as any).ratatui_sparkline_set_style(this.ptr, toFfiStyle(style)); }
  setBlockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: Array<{text:string; style?: Style}>) {
    const built = buildSpans(titleSpans);
    try { (lib as any).ratatui_sparkline_set_block_adv(this.ptr, bordersBits, borderType, padL, padT, padR, padB, built.ptr, built.len); } finally { built.free(); }
  }
  setBlockTitleAlignment(align: number){ (lib as any).ratatui_sparkline_set_block_title_alignment(this.ptr, align); }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_sparkline_free(this.ptr); sparklineRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

export class Chart {
  private ptr: Buffer; private token: object;
  constructor() { this.ptr = lib.ratatui_chart_new(); if (ref.isNull(this.ptr)) throw new Error('ratatui_chart_new failed'); this.token = {}; chartRegistry.register(this, this.ptr, this.token); }
  addLine(name: string, points: Array<[number, number]>, style?: Style) {
    const flat = new Array<number>(points.length * 2);
    for (let i = 0; i < points.length; i++) { const [x, y] = points[i]; flat[i * 2] = x; flat[i * 2 + 1] = y; }
    const Buf = F64Array(flat.length);
    const buf = new Buf(flat);
    lib.ratatui_chart_add_line(this.ptr, name, buf, points.length, toFfiStyle(style));
  }
  addDatasetWithType(name: string, points: Array<[number, number]>, style: Style | undefined, kind: number) {
    const flat = new Array<number>(points.length * 2);
    for (let i = 0; i < points.length; i++) { const [x, y] = points[i]; flat[i * 2] = x; flat[i * 2 + 1] = y; }
    const Buf = F64Array(flat.length);
    const buf = new Buf(flat);
    (lib as any).ratatui_chart_add_dataset_with_type(this.ptr, name ?? ref.NULL, buf, points.length, toFfiStyle(style), kind);
  }
  addDatasets(specs: Array<{ name: string; points: Array<[number,number]>; style?: Style; kind: number }>) {
    const tmp: any[] = [];
    const keep: Buffer[] = [];
    for (const s of specs) {
      const flat = new Array<number>(s.points.length * 2);
      for (let i=0;i<s.points.length;i++){ const [x,y]=s.points[i]; flat[i*2]=x; flat[i*2+1]=y; }
      const Buf = F64Array(flat.length); const buf = new Buf(flat);
      keep.push(buf);
      const spec = new (ref.struct({ name_utf8: ref.types.CString, points_xy: ref.refType(ref.types.double), len_pairs: ref.types.size_t || ref.types.ulong, style: FfiStyle, kind: ref.types.uint32 }) as any)({ name_utf8: s.name ?? ref.NULL, points_xy: buf, len_pairs: s.points.length, style: toFfiStyle(s.style), kind: s.kind });
      tmp.push(spec);
    }
    const Arr = ArrayType(tmp[0]?.constructor || ref.types.void, tmp.length);
    const arr = new Arr(tmp);
    try { (lib as any).ratatui_chart_add_datasets(this.ptr, arr, specs.length); } finally { keep.length = 0; }
  }
  setAxesTitles(x?: string | null, y?: string | null) { lib.ratatui_chart_set_axes_titles(this.ptr, x ?? ref.NULL, y ?? ref.NULL); }
  setAxisStyles(xStyle?: Style, yStyle?: Style) { (lib as any).ratatui_chart_set_axis_styles(this.ptr, toFfiStyle(xStyle), toFfiStyle(yStyle)); }
  setBounds(xmin:number,xmax:number,ymin:number,ymax:number){ (lib as any).ratatui_chart_set_bounds(this.ptr, xmin,xmax,ymin,ymax); }
  setLegendPosition(pos: number) { (lib as any).ratatui_chart_set_legend_position(this.ptr, pos); }
  setHiddenLegendConstraints(kinds2: [number,number], values2: [number,number]) { const U32Arr = ArrayType(ref.types.uint32, 2); const U16Arr = ArrayType(ref.types.uint16, 2); const kb = new U32Arr([kinds2[0], kinds2[1]]); const vb = new U16Arr([values2[0], values2[1]]); (lib as any).ratatui_chart_set_hidden_legend_constraints(this.ptr, kb, vb); }
  setStyle(style?: Style) { (lib as any).ratatui_chart_set_style(this.ptr, toFfiStyle(style)); }
  setXLabelsSpans(lines: Array<Array<{ text: string; style?: Style }>>) { const built = buildLineSpans(lines); try { (lib as any).ratatui_chart_set_x_labels_spans(this.ptr, built.ptr, built.len); } finally { built.free(); } }
  setYLabelsSpans(lines: Array<Array<{ text: string; style?: Style }>>) { const built = buildLineSpans(lines); try { (lib as any).ratatui_chart_set_y_labels_spans(this.ptr, built.ptr, built.len); } finally { built.free(); } }
  setLabelsAlignment(xAlign: number, yAlign: number) { (lib as any).ratatui_chart_set_labels_alignment(this.ptr, xAlign, yAlign); }
  reserveDatasets(n: number) { (lib as any).ratatui_chart_reserve_datasets(this.ptr, n); }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_chart_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
  setBlockTitleAlignment(align: number) { (lib as any).ratatui_chart_set_block_title_alignment(this.ptr, align); }
  setBlockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: Array<{text:string; style?: Style}>) {
    const built = buildSpans(titleSpans);
    try { (lib as any).ratatui_chart_set_block_adv(this.ptr, bordersBits, borderType, padL, padT, padR, padB, built.ptr, built.len); } finally { built.free(); }
  }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_chart_free(this.ptr); chartRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

// Finalizers for new widgets
const listRegistry = new FinalizationRegistry<Buffer>((ptr) => { try { lib.ratatui_list_free(ptr); } catch {} });
const tableRegistry = new FinalizationRegistry<Buffer>((ptr) => { try { lib.ratatui_table_free(ptr); } catch {} });
const gaugeRegistry = new FinalizationRegistry<Buffer>((ptr) => { try { lib.ratatui_gauge_free(ptr); } catch {} });
const tabsRegistry = new FinalizationRegistry<Buffer>((ptr) => { try { lib.ratatui_tabs_free(ptr); } catch {} });
const barChartRegistry = new FinalizationRegistry<Buffer>((ptr) => { try { lib.ratatui_barchart_free(ptr); } catch {} });
const sparklineRegistry = new FinalizationRegistry<Buffer>((ptr) => { try { lib.ratatui_sparkline_free(ptr); } catch {} });
const chartRegistry = new FinalizationRegistry<Buffer>((ptr) => { try { lib.ratatui_chart_free(ptr); } catch {} });

// -------- Batched frame drawing --------

export const widgetKind = {
  Paragraph: 1,
  List: 2,
  Table: 3,
  Gauge: 4,
  Tabs: 5,
  BarChart: 6,
  Sparkline: 7,
  Chart: 8,
  Scrollbar: 9, // available only with feature on Rust side
  LineGauge: 10,
  Clear: 11,
  RatatuiLogo: 12,
  Canvas: 13,
} as const;

export function makeDrawCmd(kind: number, handle: Buffer, r: FfiRectT): FfiDrawCmdT {
  return new (FfiDrawCmd as any)({ kind, handle, rect: r });
}

export function headlessRenderFrame(width: number, height: number, cmds: FfiDrawCmdT[]): string {
  if (cmds.length === 0) return ''.padEnd(width * height, ' ');
  // Build contiguous array of FfiDrawCmd
  const ArrayCtor = FfiDrawCmdArray(cmds.length);
  const arr = new ArrayCtor(cmds);
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_frame(width, height, arr, cmds.length, outPtr);
  if (!ok) throw new Error('headless_render_frame failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderFrameStylesEx(width: number, height: number, cmds: FfiDrawCmdT[]): string {
  if (cmds.length === 0) return '';
  const ArrayCtor = FfiDrawCmdArray(cmds.length);
  const arr = new ArrayCtor(cmds);
  const outPtr = ref.alloc(charPtr) as unknown as Buffer;
  const ok = (lib as any).ratatui_headless_render_frame_styles_ex(width, height, arr, cmds.length, outPtr);
  if (!ok) throw new Error('headless_render_frame_styles_ex failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

export function headlessRenderFrameCells(width: number, height: number, cmds: FfiDrawCmdT[]): Array<{ ch: number; fg: number; bg: number; mods: number }>{
  const cap = width * height;
  const CellsArr = ArrayType(FfiCellInfo, cap);
  const out = new CellsArr(new Array(cap).fill(new (FfiCellInfo as any)({ ch: 0, fg: 0, bg: 0, mods: 0 })));
  const ArrayCtor = FfiDrawCmdArray(cmds.length);
  const arr = new ArrayCtor(cmds);
  const count = (lib as any).ratatui_headless_render_frame_cells(width, height, arr, cmds.length, out, cap);
  if (!count || count < 0) throw new Error('headless_render_frame_cells failed');
  const result: Array<{ ch: number; fg: number; bg: number; mods: number }> = [];
  const n = Math.min(cap, Number(count));
  for (let i = 0; i < n; i++) { const c = out[i] as any; result.push({ ch: c.ch, fg: c.fg, bg: c.bg, mods: c.mods }); }
  return result;
}

export function drawFrame(term: Terminal, cmds: FfiDrawCmdT[]): boolean {
  if (cmds.length === 0) return true;
  const ArrayCtor = FfiDrawCmdArray(cmds.length);
  const arr = new ArrayCtor(cmds);
  return !!lib.ratatui_terminal_draw_frame((term as any).ptr, arr, cmds.length);
}

// Minimal FrameBuilder to batch commands ergonomically
export class FrameBuilder {
  private cmds: FfiDrawCmdT[] = [];
  add(kind: number, handle: Buffer, r: FfiRectT): this { this.cmds.push(makeDrawCmd(kind, handle, r)); return this; }
  toArray(): FfiDrawCmdT[] { return this.cmds; }
}

// -------- Layout helpers --------
export const direction = { Vertical: 0, Horizontal: 1 } as const;
export type Constraint =
  | { kind: 'Percentage'; value: number }
  | { kind: 'Length'; value: number }
  | { kind: 'Min'; value: number };

function toConstraintKind(c: Constraint): number {
  switch (c.kind) {
    case 'Percentage': return 1;
    case 'Min': return 2;
    default: return 0; // Length
  }
}

export function layoutSplitEx2(
  width: number,
  height: number,
  dir: number,
  constraints: Constraint[],
  spacing = 0,
  marginL = 0,
  marginT = 0,
  marginR = 0,
  marginB = 0,
): FfiRectT[] {
  const kindsArr = constraints.map(toConstraintKind);
  const valsA = constraints.map(c => c.value as number);
  const valsB = new Array<number>(constraints.length).fill(0);
  const U32Arr = ArrayType(ref.types.uint32, kindsArr.length);
  const U16Arr = ArrayType(ref.types.uint16, valsA.length);
  const kindsBuf = new U32Arr(kindsArr);
  const valsABuf = new U16Arr(valsA);
  const valsBBuf = new U16Arr(valsB);
  const outCap = constraints.length;
  const RectArr = ArrayType(FfiRect, outCap);
  const outRects = new RectArr(new Array(outCap).fill(new (FfiRect as any)({ x: 0, y: 0, width: 0, height: 0 })));
  (lib as any).ratatui_layout_split_ex2(
    width, height, dir,
    kindsBuf, valsABuf, valsBBuf, constraints.length,
    spacing, marginL, marginT, marginR, marginB,
    outRects, outCap,
  );
  // Convert to plain rects
  const rects: FfiRectT[] = [] as any;
  for (let i = 0; i < outCap; i++) rects.push(outRects[i]);
  return rects;
}

export function layoutSplitPercentages(
  width: number,
  height: number,
  dir: number,
  percentages: number[],
  spacing = 0,
  marginL = 0,
  marginT = 0,
  marginR = 0,
  marginB = 0,
): FfiRectT[] {
  const cons = percentages.map(p => ({ kind: 'Percentage', value: p }) as Constraint);
  return layoutSplitEx2(width, height, dir, cons, spacing, marginL, marginT, marginR, marginB);
}

// -------- Test helpers: event injection --------
export const inject = {
  key(code: number, ch = 0, mods = 0) { lib.ratatui_inject_key(code, ch, mods); },
  resize(width: number, height: number) { lib.ratatui_inject_resize(width, height); },
  mouse(kind: number, btn: number, x: number, y: number, mods = 0) { lib.ratatui_inject_mouse(kind, btn, x, y, mods); },
};

// -------- Optional: Scrollbar (feature-gated in Rust) --------

type FnNew = () => Buffer;
type FnVoidP = (p: Buffer) => void;
type FnConfigure = (p: Buffer, orient: number, position: number, content_len: number, viewport_len: number) => void;
type FnSetBlock = (p: Buffer, title: string | Buffer, showBorder: boolean) => void;
type FnDrawIn = (term: Buffer, p: Buffer, r: FfiRectT) => boolean;
type FnHeadless = (w: number, h: number, p: Buffer, out: Buffer) => boolean;

const sc_new = makeOptionalForeign<FnNew>('ratatui_scrollbar_new', ref.refType(ref.types.void), []);
const sc_free = makeOptionalForeign<FnVoidP>('ratatui_scrollbar_free', 'void', [ref.refType(ref.types.void)]);
const sc_cfg = makeOptionalForeign<FnConfigure>('ratatui_scrollbar_configure', 'void', [ref.refType(ref.types.void), 'uint32', 'uint16', 'uint16', 'uint16']);
const sc_set_block = makeOptionalForeign<FnSetBlock>('ratatui_scrollbar_set_block_title', 'void', [ref.refType(ref.types.void), ref.types.CString, ref.types.bool]);
const sc_draw_in = makeOptionalForeign<FnDrawIn>('ratatui_terminal_draw_scrollbar_in', ref.types.bool, [ref.refType(ref.types.void), ref.refType(ref.types.void), FfiRect]);
const sc_headless = makeOptionalForeign<FnHeadless>('ratatui_headless_render_scrollbar', ref.types.bool, ['uint16', 'uint16', ref.refType(ref.types.void), charPtr]);

export const scrollbarOrient = { Vertical: 0, Horizontal: 1 } as const;

export class Scrollbar {
  private ptr: Buffer; private token: object;
  constructor(orient = scrollbarOrient.Vertical, position = 0, contentLen = 0, viewportLen = 0) {
    if (!sc_new || !sc_cfg) throw new Error('Scrollbar not available. Build ratatui_ffi with feature "scrollbar".');
    this.ptr = sc_new();
    this.token = {};
    scrollbarRegistry.register(this, this.ptr, this.token);
    sc_cfg(this.ptr, orient, position, contentLen, viewportLen);
  }
  configure(orient: number, position: number, contentLen: number, viewportLen: number) {
    if (!sc_cfg) throw new Error('Scrollbar not available');
    sc_cfg(this.ptr, orient, position, contentLen, viewportLen);
  }
  setBlockTitle(title: string | null, showBorder: boolean) {
    if (!sc_set_block) throw new Error('Scrollbar not available');
    sc_set_block(this.ptr, title ?? ref.NULL, showBorder);
  }
  drawIn(term: Terminal, r: FfiRectT): boolean {
    if (!sc_draw_in) throw new Error('Scrollbar draw not available');
    return !!sc_draw_in((term as any).ptr, this.ptr, r);
  }
  headless(width: number, height: number): string {
    if (!sc_headless) throw new Error('Scrollbar headless not available');
    const outPtr = ref.alloc(charPtr) as unknown as Buffer;
    const ok = sc_headless(width, height, this.ptr, outPtr);
    if (!ok) throw new Error('headless_render_scrollbar failed');
    const cstrPtr = outPtr.deref();
    const str = ref.readCString(cstrPtr, 0);
    lib.ratatui_string_free(cstrPtr);
    return str;
  }
  get handle() { return this.ptr; }
  free() { if (sc_free && !ref.isNull(this.ptr)) { sc_free(this.ptr); scrollbarRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

const scrollbarRegistry = new FinalizationRegistry<Buffer>((ptr) => { try { sc_free && sc_free(ptr); } catch {} });

// -------- Spans/Lines builders (FFI-safe) --------
type SpanInput = { text: string; style?: Style };
class BuiltBuffer { ptr: Buffer; len: number; keeps: Buffer[]; constructor(ptr:Buffer,len:number,keeps:Buffer[]){ this.ptr=ptr; this.len=len; this.keeps=keeps; } free(){ this.keeps.length = 0; } }
export function buildSpans(spans: SpanInput[]): BuiltBuffer {
  const keep: Buffer[] = [];
  const spanStructs: any[] = [];
  for (const s of spans) {
    const cstr = Buffer.from(s.text ?? '', 'utf8');
    const cstrPtr = ref.allocCString(cstr) as unknown as Buffer;
    keep.push(cstrPtr); keep.push(cstr);
    const fs = toFfiStyle(s.style);
    const span = new (FfiSpan as any)({ text_utf8: cstrPtr, style: fs });
    spanStructs.push(span);
  }
  const Arr = ArrayType(FfiSpan, spanStructs.length);
  const arr = new Arr(spanStructs);
  keep.push(arr);
  return new BuiltBuffer(arr, spanStructs.length, keep);
}

export function buildLineSpans(lines: SpanInput[][]): BuiltBuffer {
  const keep: Buffer[] = [];
  const lineStructs: any[] = [];
  for (const line of lines) {
    const spansBuilt = buildSpans(line);
    keep.push(spansBuilt.ptr, ...spansBuilt.keeps); // keep nested alive
    const ls = new (FfiLineSpans as any)({ spans: spansBuilt.ptr, len: spansBuilt.len });
    lineStructs.push(ls);
  }
  const Arr = ArrayType(FfiLineSpans, lineStructs.length);
  const arr = new Arr(lineStructs);
  keep.push(arr);
  return new BuiltBuffer(arr, lineStructs.length, keep);
}

export function buildCellsLines(cells: SpanInput[][][]): BuiltBuffer {
  // cells: Array< CellLines > where CellLines = Array<Line(Span[])>
  const keep: Buffer[] = [];
  const cellStructs: any[] = [];
  for (const cell of cells) {
    const linesBuilt = buildLineSpans(cell);
    keep.push(linesBuilt.ptr, ...linesBuilt.keeps);
    const cl = new (FfiCellLines as any)({ lines: linesBuilt.ptr, len: linesBuilt.len });
    cellStructs.push(cl);
  }
  const Arr = ArrayType(FfiCellLines, cellStructs.length);
  const arr = new Arr(cellStructs);
  keep.push(arr);
  return new BuiltBuffer(arr, cellStructs.length, keep);
}

export function buildRowsCellsLines(rows: SpanInput[][][][]): BuiltBuffer {
  // rows: Array< RowCellsLines > where RowCellsLines = Array<CellLines>
  const keep: Buffer[] = [];
  const rowStructs: any[] = [];
  for (const row of rows) {
    const cellBuilt = buildCellsLines(row);
    keep.push(cellBuilt.ptr, ...cellBuilt.keeps);
    const r = new (FfiRowCellsLines as any)({ cells: cellBuilt.ptr, len: cellBuilt.len });
    rowStructs.push(r);
  }
  const Arr = ArrayType(FfiRowCellsLines, rowStructs.length);
  const arr = new Arr(rowStructs);
  keep.push(arr);
  return new BuiltBuffer(arr, rowStructs.length, keep);
}

// -------- Canvas --------
export class Canvas {
  private ptr: Buffer; private token: object;
  constructor(xmin: number, xmax: number, ymin: number, ymax: number) {
    this.ptr = (lib as any).ratatui_canvas_new(xmin, xmax, ymin, ymax);
    if (ref.isNull(this.ptr)) throw new Error('ratatui_canvas_new failed');
    this.token = {}; canvasRegistry.register(this, this.ptr, this.token);
  }
  setBounds(xmin:number,xmax:number,ymin:number,ymax:number){ (lib as any).ratatui_canvas_set_bounds(this.ptr, xmin,xmax,ymin,ymax); return this; }
  setBackground(color:number){ (lib as any).ratatui_canvas_set_background_color(this.ptr, color); return this; }
  setMarker(marker:number){ (lib as any).ratatui_canvas_set_marker(this.ptr, marker); return this; }
  setBlockTitle(title:string|null, showBorder:boolean){ (lib as any).ratatui_canvas_set_block_title(this.ptr, title ?? ref.NULL, showBorder); return this; }
  setBlockTitleAlignment(align:number){ (lib as any).ratatui_canvas_set_block_title_alignment(this.ptr, align); return this; }
  addLine(x1:number,y1:number,x2:number,y2:number, style?:Style){ (lib as any).ratatui_canvas_add_line(this.ptr, x1,y1,x2,y2, toFfiStyle(style)); return this; }
  addRect(x:number,y:number,w:number,h:number, style?:Style, filled=false){ (lib as any).ratatui_canvas_add_rect(this.ptr, x,y,w,h, toFfiStyle(style), filled); return this; }
  addPoints(points:Array<[number,number]>, style?:Style, marker=0){ const flat = new Array<number>(points.length*2); for (let i=0;i<points.length;i++){ const [x,y]=points[i]; flat[i*2]=x; flat[i*2+1]=y; } const Buf = F64Array(flat.length); const buf = new Buf(flat); (lib as any).ratatui_canvas_add_points(this.ptr, buf, points.length, toFfiStyle(style), marker); return this; }
  get handle(){ return this.ptr; }
  free(){ if (!ref.isNull(this.ptr)) { (lib as any).ratatui_canvas_free(this.ptr); canvasRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}
const canvasRegistry = new FinalizationRegistry<Buffer>((p)=>{ try { (lib as any).ratatui_canvas_free(p); } catch {} });

// -------- LineGauge --------
export class LineGauge { private ptr: Buffer; private token: object; constructor(){ this.ptr=(lib as any).ratatui_linegauge_new(); if(ref.isNull(this.ptr)) throw new Error('ratatui_linegauge_new failed'); this.token={}; lineGaugeRegistry.register(this,this.ptr,this.token);} setRatio(r:number){ (lib as any).ratatui_linegauge_set_ratio(this.ptr, r); return this; } setLabel(s:string|null){ (lib as any).ratatui_linegauge_set_label(this.ptr, s ?? ref.NULL); return this; } setStyle(st?:Style){ (lib as any).ratatui_linegauge_set_style(this.ptr, toFfiStyle(st)); return this; } setBlockTitle(t:string|null, showBorder:boolean){ (lib as any).ratatui_linegauge_set_block_title(this.ptr, t ?? ref.NULL, showBorder); return this; } setBlockTitleAlignment(align:number){ (lib as any).ratatui_linegauge_set_block_title_alignment(this.ptr, align); return this; } get handle(){ return this.ptr; } free(){ if (!ref.isNull(this.ptr)) { (lib as any).ratatui_linegauge_free(this.ptr); lineGaugeRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }}
const lineGaugeRegistry = new FinalizationRegistry<Buffer>((p)=>{ try { (lib as any).ratatui_linegauge_free(p); } catch {} });
