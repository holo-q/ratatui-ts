import ref from 'ref-napi';
import { loadLibrary, FfiStyle as FfiStyleT, FfiRect as FfiRectT, FfiEvent as FfiEventT, FfiDrawCmd as FfiDrawCmdT, FfiDrawCmdArray, U64Array, F64Array, charPtr, makeOptionalForeign } from './native';
import { FfiStyle, FfiRect, FfiEvent, FfiDrawCmd } from './native';

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

  appendLine(text: string, style?: Style): void {
    const st = toFfiStyle(style);
    lib.ratatui_paragraph_append_line(this.ptr, text, st);
  }

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
  const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
  const ok = lib.ratatui_headless_render_chart(width, height, c.handle, outPtr);
  if (!ok) throw new Error('headless_render_chart failed');
  const cstrPtr = outPtr.deref();
  const str = ref.readCString(cstrPtr, 0);
  lib.ratatui_string_free(cstrPtr);
  return str;
}

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
  setBlockTitle(title: string | null, showBorder: boolean) {
    lib.ratatui_list_set_block_title(this.ptr, title ?? ref.NULL, showBorder);
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
  appendRow(cells: string[]) { lib.ratatui_table_append_row(this.ptr, cells.join('\t')); }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_table_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
  setSelected(index: number | null) { lib.ratatui_table_set_selected(this.ptr, index == null ? -1 : index); }
  setRowHighlightStyle(style?: Style) { lib.ratatui_table_set_row_highlight_style(this.ptr, toFfiStyle(style)); }
  setHighlightSymbol(symbol: string | null) { lib.ratatui_table_set_highlight_symbol(this.ptr, symbol ?? ref.NULL); }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_table_free(this.ptr); tableRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

export class Gauge {
  private ptr: Buffer; private token: object;
  constructor() { this.ptr = lib.ratatui_gauge_new(); if (ref.isNull(this.ptr)) throw new Error('ratatui_gauge_new failed'); this.token = {}; gaugeRegistry.register(this, this.ptr, this.token); }
  setRatio(ratio: number) { lib.ratatui_gauge_set_ratio(this.ptr, ratio); }
  setLabel(label: string | null) { lib.ratatui_gauge_set_label(this.ptr, label ?? ref.NULL); }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_gauge_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
  get handle() { return this.ptr; }
  free() { if (!ref.isNull(this.ptr)) { lib.ratatui_gauge_free(this.ptr); gaugeRegistry.unregister(this.token); (this as any).ptr = ref.NULL; } }
}

export class Tabs {
  private ptr: Buffer; private token: object;
  constructor() { this.ptr = lib.ratatui_tabs_new(); if (ref.isNull(this.ptr)) throw new Error('ratatui_tabs_new failed'); this.token = {}; tabsRegistry.register(this, this.ptr, this.token); }
  setTitles(titles: string[]) { lib.ratatui_tabs_set_titles(this.ptr, titles.join('\t')); }
  setSelected(i: number) { lib.ratatui_tabs_set_selected(this.ptr, i); }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_tabs_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
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
  setAxesTitles(x?: string | null, y?: string | null) { lib.ratatui_chart_set_axes_titles(this.ptr, x ?? ref.NULL, y ?? ref.NULL); }
  setBlockTitle(title: string | null, showBorder: boolean) { lib.ratatui_chart_set_block_title(this.ptr, title ?? ref.NULL, showBorder); }
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

export function drawFrame(term: Terminal, cmds: FfiDrawCmdT[]): boolean {
  if (cmds.length === 0) return true;
  const ArrayCtor = FfiDrawCmdArray(cmds.length);
  const arr = new ArrayCtor(cmds);
  return !!lib.ratatui_terminal_draw_frame((term as any).ptr, arr, cmds.length);
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
