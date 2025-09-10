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

// Structs mirroring the C ABI
export const FfiStyle = Struct({ fg: u32, bg: u32, mods: u16 });
export type FfiStyle = { fg: number; bg: number; mods: number };

export const FfiRect = Struct({ x: u16, y: u16, width: u16, height: u16 });
export type FfiRect = { x: number; y: number; width: number; height: number };

export const FfiKeyEvent = Struct({ code: u32, ch: u32, mods: u8 });
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
export type FfiEvent = {
  kind: number;
  key: FfiKeyEvent;
  width: number;
  height: number;
  mouse_x: number;
  mouse_y: number;
  mouse_kind: number;
  mouse_btn: number;
  mouse_mods: number;
};

export type NativeLib = ReturnType<typeof loadLibrary>;
// Common enum-likes used by the flat C ABI
export const Align = { Left: 0, Center: 1, Right: 2 } as const;
export const Direction = { Vertical: 0, Horizontal: 1 } as const;
export const Borders = { LEFT: 1, RIGHT: 2, TOP: 4, BOTTOM: 8 } as const;

// Spans batching structs
export const FfiSpan = Struct({ text_utf8: ref.types.CString, style: FfiStyle });
export type FfiSpanT = { text_utf8: string | Buffer; style: FfiStyle };
export const FfiLineSpans = Struct({ spans: ref.refType(FfiSpan), len: sizeT });
export type FfiLineSpansT = { spans: Buffer; len: number };
export const FfiCellLines = Struct({ lines: ref.refType(FfiLineSpans), len: sizeT });
export type FfiCellLinesT = { lines: Buffer; len: number };
export const FfiRowCellsLines = Struct({ cells: ref.refType(FfiCellLines), len: sizeT });
export type FfiRowCellsLinesT = { cells: Buffer; len: number };

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
    // Meta
    ratatui_ffi_version: ['void', [ref.refType(u32), ref.refType(u32), ref.refType(u32)]],
    ratatui_ffi_feature_bits: [u32, []],
    ratatui_color_rgb: [u32, [u8, u8, u8]],
    ratatui_color_indexed: [u32, [u8]],

    // Terminal
    ratatui_init_terminal: [voidPtr, []],
    ratatui_terminal_clear: ['void', [voidPtr]],
    ratatui_terminal_free: ['void', [voidPtr]],
    ratatui_terminal_draw_paragraph: [boolT, [voidPtr, voidPtr]],
    ratatui_terminal_draw_paragraph_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_terminal_size: [boolT, [ref.refType(u16), ref.refType(u16)]],

    // Paragraph
    ratatui_paragraph_new: [voidPtr, [ref.types.CString]],
    ratatui_paragraph_new_empty: [voidPtr, []],
    ratatui_paragraph_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_paragraph_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_paragraph_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_paragraph_append_line: ['void', [voidPtr, ref.types.CString, FfiStyle]],
    ratatui_paragraph_append_span: ['void', [voidPtr, ref.types.CString, FfiStyle]],
    ratatui_paragraph_append_spans: ['void', [voidPtr, ref.refType(FfiSpan), sizeT]],
    ratatui_paragraph_append_line_spans: ['void', [voidPtr, ref.refType(FfiSpan), sizeT]],
    ratatui_paragraph_append_lines_spans: ['void', [voidPtr, ref.refType(FfiLineSpans), sizeT]],
    ratatui_paragraph_line_break: ['void', [voidPtr]],
    ratatui_paragraph_reserve_lines: ['void', [voidPtr, sizeT]],
    ratatui_paragraph_set_alignment: ['void', [voidPtr, u32]],
    ratatui_paragraph_set_wrap: ['void', [voidPtr, boolT]],
    ratatui_paragraph_set_scroll: ['void', [voidPtr, u16, u16]],
    ratatui_paragraph_set_style: ['void', [voidPtr, FfiStyle]],
    ratatui_paragraph_free: ['void', [voidPtr]],

    // Headless rendering helpers
    ratatui_string_free: ['void', [charPtr]],
    ratatui_headless_render_paragraph: [boolT, [u16, u16, voidPtr, charPtrPtr]],
    ratatui_headless_render_frame: [boolT, [u16, u16, ref.refType(ref.types.void), sizeT, charPtrPtr]],
    ratatui_headless_render_frame_styles: [boolT, [u16, u16, ref.refType(ref.types.void), sizeT, charPtrPtr]],
    ratatui_headless_render_frame_styles_ex: [boolT, [u16, u16, ref.refType(ref.types.void), sizeT, charPtrPtr]],
    ratatui_headless_render_frame_cells: [boolT, [u16, u16, ref.refType(ref.types.void), sizeT, ref.refType(FfiCellInfo), sizeT]],
    ratatui_headless_render_clear: [boolT, [u16, u16, charPtrPtr]],

    // Events
    ratatui_next_event: [boolT, [u64, ref.refType(FfiEvent)]],

    // Event injection (useful for tests)
    ratatui_inject_key: ['void', [u32, u32, u8]],
    ratatui_inject_resize: ['void', [u16, u16]],
    ratatui_inject_mouse: ['void', [u32, u32, u16, u16, u8]],

    // List
    ratatui_list_new: [voidPtr, []],
    ratatui_list_free: ['void', [voidPtr]],
    ratatui_list_append_item: ['void', [voidPtr, ref.types.CString, FfiStyle]],
    ratatui_list_append_item_spans: ['void', [voidPtr, ref.refType(FfiSpan), sizeT]],
    ratatui_list_append_items_spans: ['void', [voidPtr, ref.refType(FfiLineSpans), sizeT]],
    ratatui_list_reserve_items: ['void', [voidPtr, sizeT]],
    ratatui_list_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_list_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_list_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_list_set_selected: ['void', [voidPtr, ref.types.int32]],
    ratatui_list_set_highlight_style: ['void', [voidPtr, FfiStyle]],
    ratatui_list_set_highlight_symbol: ['void', [voidPtr, ref.types.CString]],
    ratatui_list_set_highlight_spacing: ['void', [voidPtr, u32]],
    ratatui_list_set_direction: ['void', [voidPtr, u32]],
    ratatui_list_set_scroll_offset: ['void', [voidPtr, sizeT]],
    ratatui_terminal_draw_list_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_list_state_new: [voidPtr, []],
    ratatui_list_state_free: ['void', [voidPtr]],
    ratatui_list_state_set_selected: ['void', [voidPtr, ref.types.int32]],
    ratatui_list_state_set_offset: ['void', [voidPtr, sizeT]],
    ratatui_terminal_draw_list_state_in: [boolT, [voidPtr, voidPtr, FfiRect, voidPtr]],
    ratatui_headless_render_list: [boolT, [u16, u16, voidPtr, charPtrPtr]],
    ratatui_headless_render_list_state: [boolT, [u16, u16, voidPtr, voidPtr, charPtrPtr]],

    // Table
    ratatui_table_new: [voidPtr, []],
    ratatui_table_free: ['void', [voidPtr]],
    ratatui_table_set_headers: ['void', [voidPtr, ref.types.CString]],
    ratatui_table_append_row: ['void', [voidPtr, ref.types.CString]],
    ratatui_table_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_table_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_table_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_table_set_selected: ['void', [voidPtr, ref.types.int32]],
    ratatui_table_set_row_highlight_style: ['void', [voidPtr, FfiStyle]],
    ratatui_table_set_highlight_symbol: ['void', [voidPtr, ref.types.CString]],
    ratatui_table_set_header_style: ['void', [voidPtr, FfiStyle]],
    ratatui_table_set_headers_spans: ['void', [voidPtr, ref.refType(FfiLineSpans), sizeT]],
    ratatui_table_set_row_height: ['void', [voidPtr, u16]],
    ratatui_table_set_column_spacing: ['void', [voidPtr, u16]],
    ratatui_table_set_column_highlight_style: ['void', [voidPtr, FfiStyle]],
    ratatui_table_set_cell_highlight_style: ['void', [voidPtr, FfiStyle]],
    ratatui_table_set_highlight_spacing: ['void', [voidPtr, u32]],
    ratatui_table_set_widths_percentages: ['void', [voidPtr, ref.refType(u16), sizeT]],
    ratatui_table_set_widths: ['void', [voidPtr, ref.refType(u32), ref.refType(u16), sizeT]],
    ratatui_table_reserve_rows: ['void', [voidPtr, sizeT]],
    ratatui_table_append_row_spans: ['void', [voidPtr, ref.refType(FfiLineSpans), sizeT]],
    ratatui_table_append_row_cells_lines: ['void', [voidPtr, ref.refType(FfiCellLines), sizeT]],
    ratatui_table_append_rows_cells_lines: ['void', [voidPtr, ref.refType(FfiRowCellsLines), sizeT]],
    ratatui_terminal_draw_table_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_table_state_new: [voidPtr, []],
    ratatui_table_state_free: ['void', [voidPtr]],
    ratatui_table_state_set_selected: ['void', [voidPtr, ref.types.int32]],
    ratatui_table_state_set_offset: ['void', [voidPtr, sizeT]],
    ratatui_terminal_draw_table_state_in: [boolT, [voidPtr, voidPtr, FfiRect, voidPtr]],
    ratatui_headless_render_table: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Gauge
    ratatui_gauge_new: [voidPtr, []],
    ratatui_gauge_free: ['void', [voidPtr]],
    ratatui_gauge_set_ratio: ['void', [voidPtr, ref.types.float]],
    ratatui_gauge_set_label: ['void', [voidPtr, ref.types.CString]],
    ratatui_gauge_set_styles: ['void', [voidPtr, FfiStyle, FfiStyle, FfiStyle]],
    ratatui_gauge_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_gauge_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_gauge_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_terminal_draw_gauge_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_headless_render_gauge: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Tabs
    ratatui_tabs_new: [voidPtr, []],
    ratatui_tabs_free: ['void', [voidPtr]],
    ratatui_tabs_set_titles: ['void', [voidPtr, ref.types.CString]],
    ratatui_tabs_clear_titles: ['void', [voidPtr]],
    ratatui_tabs_add_title_spans: ['void', [voidPtr, ref.refType(FfiSpan), sizeT]],
    ratatui_tabs_set_titles_spans: ['void', [voidPtr, ref.refType(FfiLineSpans), sizeT]],
    ratatui_tabs_set_selected: ['void', [voidPtr, u16]],
    ratatui_tabs_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_tabs_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_tabs_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_tabs_set_styles: ['void', [voidPtr, FfiStyle, FfiStyle]],
    ratatui_tabs_set_divider: ['void', [voidPtr, ref.types.CString]],
    ratatui_terminal_draw_tabs_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_headless_render_tabs: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Bar chart
    ratatui_barchart_new: [voidPtr, []],
    ratatui_barchart_free: ['void', [voidPtr]],
    ratatui_barchart_set_values: ['void', [voidPtr, ref.refType(u64), sizeT]],
    ratatui_barchart_set_labels: ['void', [voidPtr, ref.types.CString]],
    ratatui_barchart_set_bar_width: ['void', [voidPtr, u16]],
    ratatui_barchart_set_bar_gap: ['void', [voidPtr, u16]],
    ratatui_barchart_set_styles: ['void', [voidPtr, FfiStyle, FfiStyle, FfiStyle]],
    ratatui_barchart_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_barchart_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_barchart_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_terminal_draw_barchart_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_headless_render_barchart: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Sparkline
    ratatui_sparkline_new: [voidPtr, []],
    ratatui_sparkline_free: ['void', [voidPtr]],
    ratatui_sparkline_set_values: ['void', [voidPtr, ref.refType(u64), sizeT]],
    ratatui_sparkline_set_max: ['void', [voidPtr, u64]],
    ratatui_sparkline_set_style: ['void', [voidPtr, FfiStyle]],
    ratatui_sparkline_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_sparkline_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_sparkline_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_terminal_draw_sparkline_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_headless_render_sparkline: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Chart
    ratatui_chart_new: [voidPtr, []],
    ratatui_chart_free: ['void', [voidPtr]],
    ratatui_chart_add_line: ['void', [voidPtr, ref.types.CString, ref.refType(ref.types.double), sizeT, FfiStyle]],
    ratatui_chart_add_dataset_with_type: ['void', [voidPtr, ref.types.CString, ref.refType(ref.types.double), sizeT, FfiStyle, u32]],
    ratatui_chart_add_datasets: ['void', [voidPtr, ref.refType(Struct({ name_utf8: ref.types.CString, points_xy: ref.refType(ref.types.double), len_pairs: sizeT, style: FfiStyle, kind: u32 })), sizeT]],
    ratatui_chart_set_axes_titles: ['void', [voidPtr, ref.types.CString, ref.types.CString]],
    ratatui_chart_set_axis_styles: ['void', [voidPtr, FfiStyle, FfiStyle]],
    ratatui_chart_set_bounds: ['void', [voidPtr, ref.types.double, ref.types.double, ref.types.double, ref.types.double]],
    ratatui_chart_set_legend_position: ['void', [voidPtr, u32]],
    ratatui_chart_set_hidden_legend_constraints: ['void', [voidPtr, ref.refType(u32), ref.refType(u16)]],
    ratatui_chart_set_style: ['void', [voidPtr, FfiStyle]],
    ratatui_chart_set_x_labels_spans: ['void', [voidPtr, ref.refType(FfiLineSpans), sizeT]],
    ratatui_chart_set_y_labels_spans: ['void', [voidPtr, ref.refType(FfiLineSpans), sizeT]],
    ratatui_chart_set_labels_alignment: ['void', [voidPtr, u32, u32]],
    ratatui_chart_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_chart_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_terminal_draw_chart_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_headless_render_chart: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Chart reserve/alignment extras
    ratatui_chart_reserve_datasets: ['void', [voidPtr, sizeT]],
    ratatui_chart_set_block_title_alignment: ['void', [voidPtr, u32]],

    // Clear and Logo
    ratatui_clear_in: [boolT, [voidPtr, FfiRect]],
    ratatui_headless_render_clear: [boolT, [u16, u16, charPtrPtr]],
    ratatui_ratatuilogo_draw_in: [boolT, [voidPtr, FfiRect]],
    ratatui_ratatuilogo_draw_sized_in: [boolT, [voidPtr, FfiRect, u32]],
    ratatui_headless_render_ratatuilogo: [boolT, [u16, u16, charPtrPtr]],
    ratatui_headless_render_ratatuilogo_sized: [boolT, [u16, u16, u32, charPtrPtr]],

    // LineGauge
    ratatui_linegauge_new: [voidPtr, []],
    ratatui_linegauge_free: ['void', [voidPtr]],
    ratatui_linegauge_set_ratio: ['void', [voidPtr, ref.types.float]],
    ratatui_linegauge_set_label: ['void', [voidPtr, ref.types.CString]],
    ratatui_linegauge_set_style: ['void', [voidPtr, FfiStyle]],
    ratatui_linegauge_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_linegauge_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_linegauge_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_terminal_draw_linegauge_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_headless_render_linegauge: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Scrollbar (feature-gated in Rust; available if compiled)
    ratatui_scrollbar_new: [voidPtr, []],
    ratatui_scrollbar_free: ['void', [voidPtr]],
    ratatui_scrollbar_configure: ['void', [voidPtr, u32, u16, u16, u16]],
    ratatui_scrollbar_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_scrollbar_set_orientation_side: ['void', [voidPtr, u32]],
    ratatui_scrollbar_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_scrollbar_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_terminal_draw_scrollbar_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_headless_render_scrollbar: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Batched frame rendering
    ratatui_terminal_draw_frame: [boolT, [voidPtr, ref.refType(ref.types.void), sizeT]],

    // Layout helpers
    ratatui_layout_split: ['void', [u16, u16, u32, ref.refType(u16), sizeT, ref.refType(FfiRect), sizeT]],
    ratatui_layout_split_ex: ['void', [u16, u16, u32, ref.refType(u16), sizeT, u16, u16, u16, u16, ref.refType(FfiRect), sizeT]],
    ratatui_layout_split_ex2: ['void', [u16, u16, u32,
      ref.refType(u32), ref.refType(u16), ref.refType(u16), sizeT,
      u16, u16, u16, u16, u16, ref.refType(FfiRect), sizeT]],

    // Canvas
    ratatui_canvas_new: [voidPtr, [ref.types.double, ref.types.double, ref.types.double, ref.types.double]],
    ratatui_canvas_free: ['void', [voidPtr]],
    ratatui_canvas_set_bounds: ['void', [voidPtr, ref.types.double, ref.types.double, ref.types.double, ref.types.double]],
    ratatui_canvas_set_background_color: ['void', [voidPtr, u32]],
    ratatui_canvas_set_block_title: ['void', [voidPtr, ref.types.CString, boolT]],
    ratatui_canvas_set_block_adv: ['void', [voidPtr, u8, u32, u16, u16, u16, u16, ref.refType(FfiSpan), sizeT]],
    ratatui_canvas_set_block_title_alignment: ['void', [voidPtr, u32]],
    ratatui_canvas_set_marker: ['void', [voidPtr, u32]],
    ratatui_canvas_add_line: ['void', [voidPtr, ref.types.double, ref.types.double, ref.types.double, ref.types.double, FfiStyle]],
    ratatui_canvas_add_rect: ['void', [voidPtr, ref.types.double, ref.types.double, ref.types.double, ref.types.double, FfiStyle, boolT]],
    ratatui_canvas_add_points: ['void', [voidPtr, ref.refType(ref.types.double), sizeT, FfiStyle, u32]],
    ratatui_terminal_draw_canvas_in: [boolT, [voidPtr, voidPtr, FfiRect]],
    ratatui_headless_render_canvas: [boolT, [u16, u16, voidPtr, charPtrPtr]],

    // Terminal helpers
    ratatui_terminal_size: [boolT, [ref.refType(u16), ref.refType(u16)]],
    ratatui_terminal_disable_raw: [boolT, [voidPtr]],
    ratatui_terminal_enable_raw: [boolT, [voidPtr]],
    ratatui_terminal_enter_alt: [boolT, [voidPtr]],
    ratatui_terminal_leave_alt: [boolT, [voidPtr]],
    ratatui_terminal_get_cursor_position: [boolT, [voidPtr, ref.refType(u16), ref.refType(u16)]],
    ratatui_terminal_set_cursor_position: [boolT, [voidPtr, u16, u16]],
    ratatui_terminal_show_cursor: [boolT, [voidPtr, boolT]],
    ratatui_terminal_set_viewport_area: [boolT, [voidPtr, FfiRect]],
    ratatui_terminal_get_viewport_area: [boolT, [voidPtr, ref.refType(FfiRect)]],
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

// Struct for batched draw commands
export const FfiDrawCmd = Struct({
  kind: u32,
  handle: voidPtr,
  rect: FfiRect,
});
export type FfiDrawCmd = { kind: number; handle: Buffer; rect: FfiRectT };
export const FfiDrawCmdArray = (len: number) => ArrayType(FfiDrawCmd, len);

// Typed array helpers
export const U64Array = (len: number) => ArrayType(u64, len);
export const F64Array = (len: number) => ArrayType(ref.types.double, len);

// Cell info struct for headless cells dump
export const FfiCellInfo = Struct({ ch: u32, fg: u32, bg: u32, mods: u16 });
export type FfiCellInfoT = { ch: number; fg: number; bg: number; mods: number };
