// GENERATED from bindings.json by scripts/gen-native.js — DO NOT EDIT. Regenerate with `just gen`. ffi=0.2.6 ratatui=0.30

import path from 'path';
import fs from 'fs';
import ffi from 'ffi-napi';
import ref from 'ref-napi';
const ArrayType = require('ref-array-di')(ref);
const Struct = require('ref-struct-di')(ref);

// Basic C types
export const voidPtr = ref.refType(ref.types.void);
export const charPtr = ref.refType(ref.types.char);
export const charPtrPtr = ref.refType(charPtr);
export const boolT = ref.types.bool;
export const u8 = ref.types.uint8;
export const u16 = ref.types.uint16;
export const u32 = ref.types.uint32;
export const u64 = ref.types.uint64;
export const sizeT = ref.types.size_t || ref.types.ulong; // fallback

// Value-structs mirroring the C ABI (field order == manifest order == C layout)
export const FfiAccentedPaletteU32 = Struct({
  c50: u32,
  c100: u32,
  c200: u32,
  c300: u32,
  c400: u32,
  c500: u32,
  c600: u32,
  c700: u32,
  c800: u32,
  c900: u32,
  a100: u32,
  a200: u32,
  a400: u32,
  a700: u32,
});
export type FfiAccentedPaletteU32 = { c50: number; c100: number; c200: number; c300: number; c400: number; c500: number; c600: number; c700: number; c800: number; c900: number; a100: number; a200: number; a400: number; a700: number };

export const FfiStyle = Struct({
  fg: u32,
  bg: u32,
  mods: u16,
});
export type FfiStyle = { fg: number; bg: number; mods: number };

export const FfiCanvasLine = Struct({
  x1: ref.types.double,
  y1: ref.types.double,
  x2: ref.types.double,
  y2: ref.types.double,
  style: FfiStyle,
});
export type FfiCanvasLine = { x1: number; y1: number; x2: number; y2: number; style: FfiStyle };

export const FfiCanvasPoints = Struct({
  points_xy: voidPtr,
  len_pairs: sizeT,
  style: FfiStyle,
  marker: u32,
});
export type FfiCanvasPoints = { points_xy: Buffer; len_pairs: number; style: FfiStyle; marker: number };

export const FfiCanvasRect = Struct({
  x: ref.types.double,
  y: ref.types.double,
  w: ref.types.double,
  h: ref.types.double,
  style: FfiStyle,
  filled: boolT,
});
export type FfiCanvasRect = { x: number; y: number; w: number; h: number; style: FfiStyle; filled: boolean };

export const FfiCellInfo = Struct({
  ch: u32,
  fg: u32,
  bg: u32,
  mods: u16,
});
export type FfiCellInfo = { ch: number; fg: number; bg: number; mods: number };

export const FfiCellLines = Struct({
  lines: voidPtr,
  len: sizeT,
});
export type FfiCellLines = { lines: Buffer; len: number };

export const FfiChartDatasetSpec = Struct({
  name_utf8: ref.types.CString,
  points_xy: voidPtr,
  len_pairs: sizeT,
  style: FfiStyle,
  kind: u32,
});
export type FfiChartDatasetSpec = { name_utf8: string | Buffer; points_xy: Buffer; len_pairs: number; style: FfiStyle; kind: number };

export const FfiRect = Struct({
  x: u16,
  y: u16,
  width: u16,
  height: u16,
});
export type FfiRect = { x: number; y: number; width: number; height: number };

export const FfiDrawCmd = Struct({
  kind: u32,
  handle: voidPtr,
  rect: FfiRect,
});
export type FfiDrawCmd = { kind: number; handle: Buffer; rect: FfiRect };

export const FfiKeyEvent = Struct({
  code: u32,
  ch: u32,
  mods: u8,
});
export type FfiKeyEvent = { code: number; ch: number; mods: number };

export const FfiEvent = Struct({
  kind: u32,
  key: FfiKeyEvent,
  width: u16,
  height: u16,
  mouse_x: u16,
  mouse_y: u16,
  mouse_kind: u32,
  mouse_btn: u32,
  mouse_mods: u8,
});
export type FfiEvent = { kind: number; key: FfiKeyEvent; width: number; height: number; mouse_x: number; mouse_y: number; mouse_kind: number; mouse_btn: number; mouse_mods: number };

export const FfiLineSpans = Struct({
  spans: voidPtr,
  len: sizeT,
});
export type FfiLineSpans = { spans: Buffer; len: number };

export const FfiMarginDto = Struct({
  horizontal: u16,
  vertical: u16,
});
export type FfiMarginDto = { horizontal: number; vertical: number };

export const FfiNonAccentedPaletteU32 = Struct({
  c50: u32,
  c100: u32,
  c200: u32,
  c300: u32,
  c400: u32,
  c500: u32,
  c600: u32,
  c700: u32,
  c800: u32,
  c900: u32,
});
export type FfiNonAccentedPaletteU32 = { c50: number; c100: number; c200: number; c300: number; c400: number; c500: number; c600: number; c700: number; c800: number; c900: number };

export const FfiOffsetDto = Struct({
  x: ref.types.int32,
  y: ref.types.int32,
});
export type FfiOffsetDto = { x: number; y: number };

export const FfiPositionDto = Struct({
  x: u16,
  y: u16,
});
export type FfiPositionDto = { x: number; y: number };

export const FfiRowCellsLines = Struct({
  cells: voidPtr,
  len: sizeT,
});
export type FfiRowCellsLines = { cells: Buffer; len: number };

export const FfiSizeDto = Struct({
  width: u16,
  height: u16,
});
export type FfiSizeDto = { width: number; height: number };

export const FfiSpan = Struct({
  text_utf8: ref.types.CString,
  style: FfiStyle,
});
export type FfiSpan = { text_utf8: string | Buffer; style: FfiStyle };

export const FfiStr = Struct({
  ptr: voidPtr,
  len: sizeT,
});
export type FfiStr = { ptr: Buffer; len: number };

export const FfiSymbolsBarSet = Struct({
  full: FfiStr,
  seven_eighths: FfiStr,
  three_quarters: FfiStr,
  five_eighths: FfiStr,
  half: FfiStr,
  three_eighths: FfiStr,
  one_quarter: FfiStr,
  one_eighth: FfiStr,
  empty: FfiStr,
});
export type FfiSymbolsBarSet = { full: FfiStr; seven_eighths: FfiStr; three_quarters: FfiStr; five_eighths: FfiStr; half: FfiStr; three_eighths: FfiStr; one_quarter: FfiStr; one_eighth: FfiStr; empty: FfiStr };

export const FfiSymbolsBlockSet = Struct({
  full: FfiStr,
  seven_eighths: FfiStr,
  three_quarters: FfiStr,
  five_eighths: FfiStr,
  half: FfiStr,
  three_eighths: FfiStr,
  one_quarter: FfiStr,
  one_eighth: FfiStr,
  empty: FfiStr,
});
export type FfiSymbolsBlockSet = { full: FfiStr; seven_eighths: FfiStr; three_quarters: FfiStr; five_eighths: FfiStr; half: FfiStr; three_eighths: FfiStr; one_quarter: FfiStr; one_eighth: FfiStr; empty: FfiStr };

export const FfiSymbolsBorderSet = Struct({
  top_left: FfiStr,
  top_right: FfiStr,
  bottom_left: FfiStr,
  bottom_right: FfiStr,
  vertical_left: FfiStr,
  vertical_right: FfiStr,
  horizontal_top: FfiStr,
  horizontal_bottom: FfiStr,
});
export type FfiSymbolsBorderSet = { top_left: FfiStr; top_right: FfiStr; bottom_left: FfiStr; bottom_right: FfiStr; vertical_left: FfiStr; vertical_right: FfiStr; horizontal_top: FfiStr; horizontal_bottom: FfiStr };

export const FfiSymbolsLineSet = Struct({
  vertical: FfiStr,
  horizontal: FfiStr,
  top_right: FfiStr,
  top_left: FfiStr,
  bottom_right: FfiStr,
  bottom_left: FfiStr,
  vertical_left: FfiStr,
  vertical_right: FfiStr,
  horizontal_down: FfiStr,
  horizontal_up: FfiStr,
  cross: FfiStr,
});
export type FfiSymbolsLineSet = { vertical: FfiStr; horizontal: FfiStr; top_right: FfiStr; top_left: FfiStr; bottom_right: FfiStr; bottom_left: FfiStr; vertical_left: FfiStr; vertical_right: FfiStr; horizontal_down: FfiStr; horizontal_up: FfiStr; cross: FfiStr };

export const FfiSymbolsScrollbarSet = Struct({
  track: FfiStr,
  thumb: FfiStr,
  begin: FfiStr,
  end: FfiStr,
});
export type FfiSymbolsScrollbarSet = { track: FfiStr; thumb: FfiStr; begin: FfiStr; end: FfiStr };

export const FfiTabsStyles = Struct({
  unselected: FfiStyle,
  selected: FfiStyle,
});
export type FfiTabsStyles = { unselected: FfiStyle; selected: FfiStyle };

export const FfiTailwindPaletteU32 = Struct({
  c50: u32,
  c100: u32,
  c200: u32,
  c300: u32,
  c400: u32,
  c500: u32,
  c600: u32,
  c700: u32,
  c800: u32,
  c900: u32,
  c950: u32,
});
export type FfiTailwindPaletteU32 = { c50: number; c100: number; c200: number; c300: number; c400: number; c500: number; c600: number; c700: number; c800: number; c900: number; c950: number };

export const FfiU16Slice = Struct({
  ptr: voidPtr,
  len: sizeT,
});
export type FfiU16Slice = { ptr: Buffer; len: number };

// Enums (named integer constants)
export const FfiAlign = { Center: 0, Left: 1, Right: 2 } as const;
export const FfiBorderType = { Double: 0, Plain: 1, QuadrantInside: 2, QuadrantOutside: 3, Rounded: 4, Thick: 5 } as const;
export const FfiClearType = { All: 0, AfterCursor: 1, BeforeCursor: 2, CurrentLine: 3, UntilNewLine: 4 } as const;
export const FfiColor = { Reset: 0, Black: 1, Red: 2, Green: 3, Yellow: 4, Blue: 5, Magenta: 6, Cyan: 7, Gray: 8, DarkGray: 9, LightRed: 10, LightGreen: 11, LightYellow: 12, LightBlue: 13, LightMagenta: 14, LightCyan: 15, White: 16, Indexed: 17, Rgb: 18 } as const;
export const FfiConstraint = { Min: 0, Max: 1, Length: 2, Percentage: 3, Ratio: 4, Fill: 5 } as const;
export const FfiConstraintKind = { Length: 0, Percentage: 1, Min: 2 } as const;
export const FfiDirection = { Horizontal: 0, Vertical: 1 } as const;
export const FfiEventKind = { None: 0, Key: 1, Resize: 2, Mouse: 3 } as const;
export const FfiFlex = { Center: 0, End: 1, Legacy: 2, SpaceAround: 3, SpaceBetween: 4, Start: 5 } as const;
export const FfiGraphType = { Bar: 0, Line: 1, Scatter: 2 } as const;
export const FfiHighlightSpacing = { Always: 0, Never: 1, WhenSelected: 2 } as const;
export const FfiKeyCode = { Char: 0, Enter: 1, Left: 2, Right: 3, Up: 4, Down: 5, Esc: 6, Backspace: 7, Tab: 8, Delete: 9, Home: 10, End: 11, PageUp: 12, PageDown: 13, Insert: 14, F1: 100, F2: 101, F3: 102, F4: 103, F5: 104, F6: 105, F7: 106, F8: 107, F9: 108, F10: 109, F11: 110, F12: 111 } as const;
export const FfiLegendPosition = { Bottom: 0, BottomLeft: 1, BottomRight: 2, Left: 3, Right: 4, Top: 5, TopLeft: 6, TopRight: 7 } as const;
export const FfiListDirection = { BottomToTop: 0, TopToBottom: 1 } as const;
export const FfiMapResolution = { Low: 0, High: 1 } as const;
export const FfiMarker = { Bar: 0, Block: 1, Braille: 2, Dot: 3, HalfBlock: 4 } as const;
export const FfiMascotEye = { Default: 0, Red: 1 } as const;
export const FfiMouseButton = { Left: 1, Right: 2, Middle: 3, None: 0 } as const;
export const FfiMouseKind = { Down: 1, Up: 2, Drag: 3, Moved: 4, ScrollUp: 5, ScrollDown: 6 } as const;
export const FfiPosition = { Bottom: 0, Top: 1 } as const;
export const FfiRenderDirection = { LeftToRight: 0, RightToLeft: 1 } as const;
export const FfiScrollDirection = { Forward: 0, Backward: 1 } as const;
export const FfiScrollbarOrient = { Vertical: 0, Horizontal: 1 } as const;
export const FfiScrollbarOrientation = { VerticalRight: 0, VerticalLeft: 1, HorizontalBottom: 2, HorizontalTop: 3 } as const;
export const FfiSize = { Tiny: 0, Small: 1 } as const;
export const FfiSpacing = { Space: 0, Overlap: 1 } as const;
export const FfiViewport = { Fullscreen: 0, Inline: 1, Fixed: 2 } as const;
export const FfiWidgetKind = { Paragraph: 1, List: 2, Table: 3, Gauge: 4, Tabs: 5, BarChart: 6, Sparkline: 7, Chart: 8, Scrollbar: 9, LineGauge: 10, Clear: 11, RatatuiLogo: 12, Canvas: 13 } as const;

// Bitflags (named integer constants)
export const FfiBorders = { NONE: 0, LEFT: 1, RIGHT: 2, TOP: 4, BOTTOM: 8 } as const;
export const FfiFeatures = { SCROLLBAR: 1, CANVAS: 2, STYLE_DUMP_EX: 4, BATCH_TABLE_ROWS: 8, BATCH_LIST_ITEMS: 16, COLOR_HELPERS: 32, AXIS_LABELS: 64, SPAN_SETTERS: 128 } as const;
export const FfiKeyMods = { NONE: 0, SHIFT: 1, ALT: 2, CTRL: 4 } as const;
export const FfiStyleMods = { NONE: 0, BOLD: 1, ITALIC: 2, UNDERLINE: 4, DIM: 8, CROSSED: 16, REVERSED: 32, RAPIDBLINK: 64, SLOWBLINK: 128, HIDDEN: 256 } as const;

// Compatibility aliases (prior unprefixed names consumed by index.ts)
export const Align = FfiAlign;
export const Direction = { Vertical: 0, Horizontal: 1 } as const;
export const Borders = FfiBorders;

function platformLibName(): string {
  if (process.platform === 'win32') return 'ratatui_ffi.dll';
  if (process.platform === 'darwin') return 'libratatui_ffi.dylib';
  return 'libratatui_ffi.so';
}

function tryPaths(): string[] {
  const env = process.env.RATATUI_FFI_PATH;
  const here = path.resolve(__dirname);
  const candidates = [] as string[];
  if (env) candidates.push(env);
  // packaged native/ location inside this module
  candidates.push(path.resolve(here, '..', 'native', platformLibName()));
  candidates.push(path.resolve(here, 'native', platformLibName()));
  // prebuilt per-platform locations
  const plat = `${process.platform}-${process.arch}`;
  candidates.push(path.resolve(here, '..', 'prebuilt', plat, platformLibName()));
  candidates.push(path.resolve(here, 'prebuilt', plat, platformLibName()));
  // in-repo common locations
  const rels = [
    ['..', '..', 'ratatui-ffi', 'target', 'release'],
    ['..', '..', 'ratatui-ffi', 'target', 'debug'],
    ['..', '..', '..', 'ratatui-ffi', 'target', 'release'],
    ['..', '..', '..', 'ratatui-ffi', 'target', 'debug'],
  ];
  for (const segs of rels) {
    candidates.push(path.resolve(here, ...segs, platformLibName()));
  }
  return candidates.filter(p => fs.existsSync(p));
}

let loadedPath: string | null = null;

export function getLoadedLibPath(): string | null { return loadedPath; }

export type NativeLib = ReturnType<typeof loadLibrary>;

export function loadLibrary(explicitPath?: string) {
  const libPath = explicitPath || tryPaths()[0];
  if (!libPath) {
    const tried = [process.env.RATATUI_FFI_PATH, ...tryPaths()].filter(Boolean).join('\n - ');
    throw new Error(
      `Unable to locate ratatui_ffi library. Set RATATUI_FFI_PATH or place the compiled library in one of:\n - ${tried}`
    );
  }
  loadedPath = libPath;

  const lib = ffi.Library(libPath, {
    ratatui_bar_get_nine_levels: [FfiSymbolsBarSet, []],
    ratatui_bar_get_three_levels: [FfiSymbolsBarSet, []],
    ratatui_barchart_free: ['void', [voidPtr]],
    ratatui_barchart_new: [voidPtr, []],
    ratatui_barchart_set_bar_gap: ['void', [voidPtr, u16]],
    ratatui_barchart_set_bar_width: ['void', [voidPtr, u16]],
    ratatui_barchart_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_barchart_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_barchart_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_barchart_set_labels: ['void', [voidPtr, ref.types.CString]],
    ratatui_barchart_set_labels_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_barchart_set_styles: ['void', [voidPtr, FfiStyle, FfiStyle, FfiStyle]],
    ratatui_barchart_set_values: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_block_get_nine_levels: [FfiSymbolsBlockSet, []],
    ratatui_block_get_three_levels: [FfiSymbolsBlockSet, []],
    ratatui_border_get_double: [FfiSymbolsBorderSet, []],
    ratatui_border_get_empty: [FfiSymbolsBorderSet, []],
    ratatui_border_get_full: [FfiSymbolsBorderSet, []],
    ratatui_border_get_one_eighth_bottom_eight: [FfiStr, []],
    ratatui_border_get_one_eighth_left_eight: [FfiStr, []],
    ratatui_border_get_one_eighth_right_eight: [FfiStr, []],
    ratatui_border_get_one_eighth_tall: [FfiSymbolsBorderSet, []],
    ratatui_border_get_one_eighth_top_eight: [FfiStr, []],
    ratatui_border_get_one_eighth_wide: [FfiSymbolsBorderSet, []],
    ratatui_border_get_plain: [FfiSymbolsBorderSet, []],
    ratatui_border_get_proportional_tall: [FfiSymbolsBorderSet, []],
    ratatui_border_get_proportional_wide: [FfiSymbolsBorderSet, []],
    ratatui_border_get_quadrant_block: [FfiStr, []],
    ratatui_border_get_quadrant_bottom_half: [FfiStr, []],
    ratatui_border_get_quadrant_bottom_left: [FfiStr, []],
    ratatui_border_get_quadrant_bottom_right: [FfiStr, []],
    ratatui_border_get_quadrant_inside: [FfiSymbolsBorderSet, []],
    ratatui_border_get_quadrant_left_half: [FfiStr, []],
    ratatui_border_get_quadrant_outside: [FfiSymbolsBorderSet, []],
    ratatui_border_get_quadrant_right_half: [FfiStr, []],
    ratatui_border_get_quadrant_top_half: [FfiStr, []],
    ratatui_border_get_quadrant_top_left: [FfiStr, []],
    ratatui_border_get_quadrant_top_left_bottom_left_bottom_right: [FfiStr, []],
    ratatui_border_get_quadrant_top_left_bottom_right: [FfiStr, []],
    ratatui_border_get_quadrant_top_left_top_right_bottom_left: [FfiStr, []],
    ratatui_border_get_quadrant_top_left_top_right_bottom_right: [FfiStr, []],
    ratatui_border_get_quadrant_top_right: [FfiStr, []],
    ratatui_border_get_quadrant_top_right_bottom_left: [FfiStr, []],
    ratatui_border_get_quadrant_top_right_bottom_left_bottom_right: [FfiStr, []],
    ratatui_border_get_rounded: [FfiSymbolsBorderSet, []],
    ratatui_border_get_thick: [FfiSymbolsBorderSet, []],
    ratatui_canvas_add_line: ['void', [voidPtr, ref.types.double, ref.types.double, ref.types.double, ref.types.double, FfiStyle]],
    ratatui_canvas_add_points: ['void', [voidPtr, voidPtr, sizeT, FfiStyle, u32]],
    ratatui_canvas_add_rect: ['void', [voidPtr, ref.types.double, ref.types.double, ref.types.double, ref.types.double, FfiStyle, boolT]],
    ratatui_canvas_free: ['void', [voidPtr]],
    ratatui_canvas_new: [voidPtr, [ref.types.double, ref.types.double, ref.types.double, ref.types.double]],
    ratatui_canvas_set_background_color: ['void', [voidPtr, u32]],
    ratatui_canvas_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_canvas_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_canvas_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_canvas_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_canvas_set_bounds: ['void', [voidPtr, ref.types.double, ref.types.double, ref.types.double, ref.types.double]],
    ratatui_canvas_set_marker: ['void', [voidPtr, u32]],
    ratatui_chart_add_dataset_with_type: ['void', [voidPtr, ref.types.CString, voidPtr, sizeT, FfiStyle, u32]],
    ratatui_chart_add_datasets: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_chart_add_line: ['void', [voidPtr, ref.types.CString, voidPtr, sizeT, FfiStyle]],
    ratatui_chart_free: ['void', [voidPtr]],
    ratatui_chart_new: [voidPtr, []],
    ratatui_chart_set_axes_titles: ['void', [voidPtr, ref.types.CString, ref.types.CString]],
    ratatui_chart_set_axis_styles: ['void', [voidPtr, FfiStyle, FfiStyle]],
    ratatui_chart_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_chart_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_chart_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_chart_set_bounds: ['void', [voidPtr, ref.types.double, ref.types.double, ref.types.double, ref.types.double]],
    ratatui_chart_set_hidden_legend_constraints: ['void', [voidPtr, voidPtr, voidPtr]],
    ratatui_chart_set_labels_alignment: ['void', [voidPtr, u32, u32]],
    ratatui_chart_set_legend_position: ['void', [voidPtr, u32]],
    ratatui_chart_set_style: ['void', [voidPtr, FfiStyle]],
    ratatui_chart_set_x_labels_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_chart_set_y_labels_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_clear_in: [boolT, [voidPtr, FfiRect]],
    ratatui_color_indexed: [u32, [u8]],
    ratatui_color_rgb: [u32, [u8, u8, u8]],
    ratatui_ffi_feature_bits: [u32, []],
    ratatui_ffi_version: [boolT, [voidPtr, voidPtr, voidPtr]],
    ratatui_gauge_free: ['void', [voidPtr]],
    ratatui_gauge_new: [voidPtr, []],
    ratatui_gauge_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_gauge_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_gauge_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_gauge_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_gauge_set_label: ['void', [voidPtr, ref.types.CString]],
    ratatui_gauge_set_label_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_gauge_set_ratio: ['void', [voidPtr, ref.types.float]],
    ratatui_gauge_set_styles: ['void', [voidPtr, FfiStyle, FfiStyle, FfiStyle]],
    ratatui_half_block_get_full: [u32, []],
    ratatui_half_block_get_lower: [u32, []],
    ratatui_half_block_get_upper: [u32, []],
    ratatui_headless_render_barchart: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_canvas: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_chart: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_clear: [boolT, [u16, u16, voidPtr]],
    ratatui_headless_render_frame: [boolT, [u16, u16, voidPtr, sizeT, voidPtr]],
    ratatui_headless_render_frame_cells: [sizeT, [u16, u16, voidPtr, sizeT, voidPtr, sizeT]],
    ratatui_headless_render_frame_styles: [boolT, [u16, u16, voidPtr, sizeT, voidPtr]],
    ratatui_headless_render_frame_styles_ex: [boolT, [u16, u16, voidPtr, sizeT, voidPtr]],
    ratatui_headless_render_gauge: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_linegauge: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_list: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_list_state: [boolT, [u16, u16, voidPtr, voidPtr, voidPtr]],
    ratatui_headless_render_paragraph: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_ratatuilogo: [boolT, [u16, u16, voidPtr]],
    ratatui_headless_render_ratatuilogo_sized: [boolT, [u16, u16, u32, voidPtr]],
    ratatui_headless_render_ratatuimascot: [boolT, [u16, u16, u32, voidPtr]],
    ratatui_headless_render_scrollbar: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_sparkline: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_table: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_headless_render_tabs: [boolT, [u16, u16, voidPtr, voidPtr]],
    ratatui_init_terminal: [voidPtr, []],
    ratatui_inject_key: ['void', [u32, u32, u8]],
    ratatui_inject_mouse: ['void', [u32, u32, u16, u16, u8]],
    ratatui_inject_resize: ['void', [u16, u16]],
    ratatui_layout_split: [sizeT, [u16, u16, u32, voidPtr, voidPtr, sizeT, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_layout_split_ex: [sizeT, [u16, u16, u32, voidPtr, voidPtr, sizeT, u16, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_layout_split_ex2: [sizeT, [u16, u16, u32, voidPtr, voidPtr, voidPtr, sizeT, u16, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_line_get_bottom_left: [FfiStr, []],
    ratatui_line_get_bottom_right: [FfiStr, []],
    ratatui_line_get_cross: [FfiStr, []],
    ratatui_line_get_double: [FfiSymbolsLineSet, []],
    ratatui_line_get_double_bottom_left: [FfiStr, []],
    ratatui_line_get_double_bottom_right: [FfiStr, []],
    ratatui_line_get_double_cross: [FfiStr, []],
    ratatui_line_get_double_horizontal: [FfiStr, []],
    ratatui_line_get_double_horizontal_down: [FfiStr, []],
    ratatui_line_get_double_horizontal_up: [FfiStr, []],
    ratatui_line_get_double_top_left: [FfiStr, []],
    ratatui_line_get_double_top_right: [FfiStr, []],
    ratatui_line_get_double_vertical: [FfiStr, []],
    ratatui_line_get_double_vertical_left: [FfiStr, []],
    ratatui_line_get_double_vertical_right: [FfiStr, []],
    ratatui_line_get_horizontal: [FfiStr, []],
    ratatui_line_get_horizontal_down: [FfiStr, []],
    ratatui_line_get_horizontal_up: [FfiStr, []],
    ratatui_line_get_normal: [FfiSymbolsLineSet, []],
    ratatui_line_get_rounded: [FfiSymbolsLineSet, []],
    ratatui_line_get_rounded_bottom_left: [FfiStr, []],
    ratatui_line_get_rounded_bottom_right: [FfiStr, []],
    ratatui_line_get_rounded_top_left: [FfiStr, []],
    ratatui_line_get_rounded_top_right: [FfiStr, []],
    ratatui_line_get_thick: [FfiSymbolsLineSet, []],
    ratatui_line_get_thick_bottom_left: [FfiStr, []],
    ratatui_line_get_thick_bottom_right: [FfiStr, []],
    ratatui_line_get_thick_cross: [FfiStr, []],
    ratatui_line_get_thick_horizontal: [FfiStr, []],
    ratatui_line_get_thick_horizontal_down: [FfiStr, []],
    ratatui_line_get_thick_horizontal_up: [FfiStr, []],
    ratatui_line_get_thick_top_left: [FfiStr, []],
    ratatui_line_get_thick_top_right: [FfiStr, []],
    ratatui_line_get_thick_vertical: [FfiStr, []],
    ratatui_line_get_thick_vertical_left: [FfiStr, []],
    ratatui_line_get_thick_vertical_right: [FfiStr, []],
    ratatui_line_get_top_left: [FfiStr, []],
    ratatui_line_get_top_right: [FfiStr, []],
    ratatui_line_get_vertical: [FfiStr, []],
    ratatui_line_get_vertical_left: [FfiStr, []],
    ratatui_line_get_vertical_right: [FfiStr, []],
    ratatui_linegauge_free: ['void', [voidPtr]],
    ratatui_linegauge_new: [voidPtr, []],
    ratatui_linegauge_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_linegauge_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_linegauge_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_linegauge_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_linegauge_set_label: ['void', [voidPtr, ref.types.CString]],
    ratatui_linegauge_set_label_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_linegauge_set_ratio: ['void', [voidPtr, ref.types.float]],
    ratatui_linegauge_set_style: ['void', [voidPtr, FfiStyle]],
    ratatui_list_append_item: ['void', [voidPtr, ref.types.CString, FfiStyle]],
    ratatui_list_append_item_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_list_append_items_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_list_free: ['void', [voidPtr]],
    ratatui_list_new: [voidPtr, []],
    ratatui_list_reserve_items: ['void', [voidPtr, sizeT]],
    ratatui_list_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_list_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_list_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_list_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_list_set_direction: ['void', [voidPtr, u32]],
    ratatui_list_set_highlight_spacing: ['void', [voidPtr, u32]],
    ratatui_list_set_highlight_style: ['void', [voidPtr, FfiStyle]],
    ratatui_list_set_highlight_symbol: ['void', [voidPtr, ref.types.CString]],
    ratatui_list_set_scroll_offset: ['void', [voidPtr, sizeT]],
    ratatui_list_set_selected: ['void', [voidPtr, ref.types.int32]],
    ratatui_list_state_free: ['void', [voidPtr]],
    ratatui_list_state_new: [voidPtr, []],
    ratatui_list_state_set_offset: ['void', [voidPtr, sizeT]],
    ratatui_list_state_set_selected: ['void', [voidPtr, ref.types.int32]],
    ratatui_next_event: [boolT, [u64, voidPtr]],
    ratatui_palette_material_get_amber: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_black: [u32, []],
    ratatui_palette_material_get_blue: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_blue_gray: [FfiNonAccentedPaletteU32, []],
    ratatui_palette_material_get_brown: [FfiNonAccentedPaletteU32, []],
    ratatui_palette_material_get_cyan: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_deep_orange: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_deep_purple: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_gray: [FfiNonAccentedPaletteU32, []],
    ratatui_palette_material_get_green: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_indigo: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_light_blue: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_light_green: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_lime: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_orange: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_pink: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_purple: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_red: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_teal: [FfiAccentedPaletteU32, []],
    ratatui_palette_material_get_white: [u32, []],
    ratatui_palette_material_get_yellow: [FfiAccentedPaletteU32, []],
    ratatui_palette_tailwind_get_amber: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_black: [u32, []],
    ratatui_palette_tailwind_get_blue: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_cyan: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_emerald: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_fuchsia: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_gray: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_green: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_indigo: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_lime: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_neutral: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_orange: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_pink: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_purple: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_red: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_rose: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_sky: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_slate: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_stone: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_teal: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_violet: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_white: [u32, []],
    ratatui_palette_tailwind_get_yellow: [FfiTailwindPaletteU32, []],
    ratatui_palette_tailwind_get_zinc: [FfiTailwindPaletteU32, []],
    ratatui_paragraph_append_line: ['void', [voidPtr, ref.types.CString, FfiStyle]],
    ratatui_paragraph_append_line_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_paragraph_append_lines_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_paragraph_append_span: ['void', [voidPtr, ref.types.CString, FfiStyle]],
    ratatui_paragraph_append_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_paragraph_free: ['void', [voidPtr]],
    ratatui_paragraph_line_break: ['void', [voidPtr]],
    ratatui_paragraph_new: [voidPtr, [ref.types.CString]],
    ratatui_paragraph_new_empty: [voidPtr, []],
    ratatui_paragraph_reserve_lines: ['void', [voidPtr, sizeT]],
    ratatui_paragraph_set_alignment: ['void', [voidPtr, u32]],
    ratatui_paragraph_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_paragraph_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_paragraph_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_paragraph_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_paragraph_set_scroll: ['void', [voidPtr, u16, u16]],
    ratatui_paragraph_set_style: ['void', [voidPtr, FfiStyle]],
    ratatui_paragraph_set_wrap: ['void', [voidPtr, boolT]],
    ratatui_ratatuilogo_draw_in: [boolT, [voidPtr, FfiRect]],
    ratatui_ratatuilogo_draw_sized_in: [boolT, [voidPtr, FfiRect, u32]],
    ratatui_ratatuimascot_draw_in: [boolT, [voidPtr, FfiRect, u32]],
    ratatui_scrollbar_configure: ['void', [voidPtr, u32, u16, u16, u16]],
    ratatui_scrollbar_free: ['void', [voidPtr]],
    ratatui_scrollbar_get_double_horizontal: [FfiSymbolsScrollbarSet, []],
    ratatui_scrollbar_get_double_vertical: [FfiSymbolsScrollbarSet, []],
    ratatui_scrollbar_get_horizontal: [FfiSymbolsScrollbarSet, []],
    ratatui_scrollbar_get_vertical: [FfiSymbolsScrollbarSet, []],
    ratatui_scrollbar_new: [voidPtr, []],
    ratatui_scrollbar_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_scrollbar_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_scrollbar_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_scrollbar_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_scrollbar_set_orientation_side: ['void', [voidPtr, u32]],
    ratatui_sparkline_free: ['void', [voidPtr]],
    ratatui_sparkline_new: [voidPtr, []],
    ratatui_sparkline_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_sparkline_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_sparkline_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_sparkline_set_max: ['void', [voidPtr, u64]],
    ratatui_sparkline_set_style: ['void', [voidPtr, FfiStyle]],
    ratatui_sparkline_set_values: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_string_free: ['void', [ref.types.CString]],
    ratatui_symbols_get_braille_dots_flat: [FfiU16Slice, []],
    ratatui_table_append_row: ['void', [voidPtr, ref.types.CString]],
    ratatui_table_append_row_cells_lines: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_table_append_row_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_table_append_rows_cells_lines: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_table_free: ['void', [voidPtr]],
    ratatui_table_new: [voidPtr, []],
    ratatui_table_reserve_rows: ['void', [voidPtr, sizeT]],
    ratatui_table_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_table_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_table_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_table_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_table_set_cell_highlight_style: ['void', [voidPtr, FfiStyle]],
    ratatui_table_set_column_highlight_style: ['void', [voidPtr, FfiStyle]],
    ratatui_table_set_column_spacing: ['void', [voidPtr, u16]],
    ratatui_table_set_header_style: ['void', [voidPtr, FfiStyle]],
    ratatui_table_set_headers: ['void', [voidPtr, ref.types.CString]],
    ratatui_table_set_headers_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_table_set_highlight_spacing: ['void', [voidPtr, u32]],
    ratatui_table_set_highlight_symbol: ['void', [voidPtr, ref.types.CString]],
    ratatui_table_set_row_height: ['void', [voidPtr, u16]],
    ratatui_table_set_row_highlight_style: ['void', [voidPtr, FfiStyle]],
    ratatui_table_set_selected: ['void', [voidPtr, ref.types.int32]],
    ratatui_table_set_widths: ['void', [voidPtr, voidPtr, voidPtr, sizeT]],
    ratatui_table_set_widths_percentages: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_table_state_free: ['void', [voidPtr]],
    ratatui_table_state_new: [voidPtr, []],
    ratatui_table_state_set_offset: ['void', [voidPtr, sizeT]],
    ratatui_table_state_set_selected: ['void', [voidPtr, ref.types.int32]],
    ratatui_tabs_add_title_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_tabs_clear_titles: ['void', [voidPtr]],
    ratatui_tabs_free: ['void', [voidPtr]],
    ratatui_tabs_new: [voidPtr, []],
    ratatui_tabs_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, voidPtr, sizeT]],
    ratatui_tabs_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_tabs_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_tabs_set_block_title_spans: ['void', [voidPtr, voidPtr, sizeT, boolT]],
    ratatui_tabs_set_divider: ['void', [voidPtr, ref.types.CString]],
    ratatui_tabs_set_divider_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_tabs_set_selected: ['void', [voidPtr, u16]],
    ratatui_tabs_set_styles: ['void', [voidPtr, FfiStyle, FfiStyle]],
    ratatui_tabs_set_titles: ['void', [voidPtr, ref.types.CString]],
    ratatui_tabs_set_titles_spans: ['void', [voidPtr, voidPtr, sizeT]],
    ratatui_terminal_clear: ['void', [voidPtr]],
    ratatui_terminal_disable_raw: [boolT, [voidPtr]],
    ratatui_terminal_draw_barchart_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_canvas_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_cells_in: [boolT, [voidPtr, voidPtr, u16, u16, FfiRect]],
    ratatui_terminal_draw_chart_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_frame: [boolT, [voidPtr, voidPtr, sizeT]],
    ratatui_terminal_draw_gauge_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_linegauge_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_list_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_list_state_in: [boolT, [voidPtr, voidPtr, FfiRect, voidPtr]],
    ratatui_terminal_draw_paragraph: [boolT, [voidPtr, voidPtr]],
    ratatui_terminal_draw_paragraph_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_scrollbar_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_sparkline_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_table_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_draw_table_state_in: [boolT, [voidPtr, voidPtr, FfiRect, voidPtr]],
    ratatui_terminal_draw_tabs_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_enable_raw: [boolT, [voidPtr]],
    ratatui_terminal_enter_alt: [boolT, [voidPtr]],
    ratatui_terminal_free: ['void', [voidPtr]],
    ratatui_terminal_get_cursor_position: [boolT, [voidPtr, voidPtr, voidPtr]],
    ratatui_terminal_get_viewport_area: [boolT, [voidPtr, voidPtr]],
    ratatui_terminal_leave_alt: [boolT, [voidPtr]],
    ratatui_terminal_set_cursor_position: [boolT, [voidPtr, u16, u16]],
    ratatui_terminal_set_viewport_area: [boolT, [voidPtr, FfiRect]],
    ratatui_terminal_show_cursor: [boolT, [voidPtr, boolT]],
    ratatui_terminal_size: [boolT, [voidPtr, voidPtr]],
  });

  return lib;
}

// Optional symbol support via DynamicLibrary
export function makeOptionalForeign<Fn extends Function>(
  name: string,
  ret: any,
  args: any[],
): Fn | null {
  if (!loadedPath) return null;
  try {
    const dlib = ffi.DynamicLibrary(loadedPath);
    const ptr = dlib.get(name);
    if (!ptr || ptr.isNull()) return null;
    const Foreign = ffi.ForeignFunction(ptr, ret, args);
    return Foreign as unknown as Fn;
  } catch {
    return null;
  }
}

// Typed array + draw-command helpers consumed by the ergonomic layer
export const FfiDrawCmdArray = (len: number) => ArrayType(FfiDrawCmd, len);
export const U64Array = (len: number) => ArrayType(u64, len);
export const F64Array = (len: number) => ArrayType(ref.types.double, len);

