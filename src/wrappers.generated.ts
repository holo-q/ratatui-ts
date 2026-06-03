// GENERATED from bindings.json by scripts/gen-wrappers.js — DO NOT EDIT. Regenerate with `just gen`. ffi=0.2.6 ratatui=0.29
//
// Stage-2 ergonomic wrappers: fluent setters / append-add / static headless
// render helpers, attached to the hand-written widget classes in ./index via
// declaration-merging (compile-time signatures) + guarded prototype install
// (runtime; hand methods always win on name collision). index.ts imports this
// module and calls installGenerated(...) once, after its classes exist —
// the dependency points one way, so there is no runtime import cycle.
// See scripts/gen-wrappers.js for the full design.

import type { BarChart, Canvas, Chart, Gauge, LineGauge, List, Paragraph, Scrollbar, Sparkline, Table, Tabs } from './index';

export type SpanInput = { text: string; style?: { fg?: number; bg?: number; mods?: number } };

// Dependencies injected by index.ts so this module never imports index at
// runtime — index.ts owns lib + the classes and passes them in.
export interface GeneratedDeps {
  ref: any;
  charPtr: any;
  lib: any;
  buildSpans: (spans: SpanInput[]) => { ptr: Buffer; len: number; free: () => void };
  buildLineSpans: (lines: SpanInput[][]) => { ptr: Buffer; len: number; free: () => void };
  BarChart: any;
  Canvas: any;
  Chart: any;
  Gauge: any;
  LineGauge: any;
  List: any;
  Paragraph: any;
  Scrollbar: any;
  Sparkline: any;
  Table: any;
  Tabs: any;
}

// Compile-time: merge generated method signatures onto the hand classes.
declare module './index' {
  interface BarChart {
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
    labelsSpans(lines: SpanInput[][]): this;
  }
}
declare module './index' {
  interface Canvas {
    blockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: SpanInput[]): this;
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
  }
}
declare module './index' {
  interface Chart {
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
  }
}
declare module './index' {
  interface Gauge {
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
    labelSpans(spans: SpanInput[]): this;
  }
}
declare module './index' {
  interface LineGauge {
    blockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: SpanInput[]): this;
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
    labelSpans(spans: SpanInput[]): this;
  }
}
declare module './index' {
  interface List {
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
  }
}
declare module './index' {
  interface Paragraph {
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
  }
}
declare module './index' {
  interface Scrollbar {
    blockAdv(bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: SpanInput[]): this;
    blockTitleAlignment(align: number): this;
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
    orientationSide(side: number): this;
  }
}
declare module './index' {
  interface Sparkline {
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
  }
}
declare module './index' {
  interface Table {
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
  }
}
declare module './index' {
  interface Tabs {
    blockTitleSpans(titleSpans: SpanInput[], showBorder: boolean): this;
    dividerSpans(spans: SpanInput[]): this;
  }
}

// index.ts calls this exactly once after constructing `lib` + classes.
export function installGenerated(d: GeneratedDeps): void {
  const { ref, charPtr, lib, buildSpans, buildLineSpans } = d;
  // Hand method wins: only install if the name is not already present
  // (own or inherited) on the target.
  const def = (target: any, name: string, value: Function): void => {
    if (name in target) return;
    Object.defineProperty(target, name, { value, writable: true, configurable: true, enumerable: false });
  };
  def(d.BarChart.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_barchart_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.BarChart.prototype, 'labelsSpans', function (this: any, lines: SpanInput[][]): any {
    const __0 = buildLineSpans(lines);
    try { lib.ratatui_barchart_set_labels_spans((this as any).handle, __0.ptr, __0.len); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Canvas.prototype, 'blockAdv', function (this: any, bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: SpanInput[]): any {
    const __6 = buildSpans(titleSpans);
    try { lib.ratatui_canvas_set_block_adv((this as any).handle, bordersBits, borderType, padL, padT, padR, padB, __6.ptr, __6.len); } finally {
    __6.free();
    }
    return this;
  });
  def(d.Canvas.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_canvas_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Canvas, 'renderHeadless', function (width: number, height: number, w: any): string {
    const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
    const ok = lib.ratatui_headless_render_canvas(width, height, (w as any).handle, outPtr);
    if (!ok) throw new Error('ratatui_headless_render_canvas failed');
    const cstrPtr = outPtr.deref();
    const str = ref.readCString(cstrPtr, 0);
    lib.ratatui_string_free(cstrPtr);
    return str;
  });
  def(d.Chart.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_chart_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Gauge.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_gauge_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Gauge.prototype, 'labelSpans', function (this: any, spans: SpanInput[]): any {
    const __0 = buildSpans(spans);
    try { lib.ratatui_gauge_set_label_spans((this as any).handle, __0.ptr, __0.len); } finally {
    __0.free();
    }
    return this;
  });
  def(d.LineGauge.prototype, 'blockAdv', function (this: any, bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: SpanInput[]): any {
    const __6 = buildSpans(titleSpans);
    try { lib.ratatui_linegauge_set_block_adv((this as any).handle, bordersBits, borderType, padL, padT, padR, padB, __6.ptr, __6.len); } finally {
    __6.free();
    }
    return this;
  });
  def(d.LineGauge.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_linegauge_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.LineGauge.prototype, 'labelSpans', function (this: any, spans: SpanInput[]): any {
    const __0 = buildSpans(spans);
    try { lib.ratatui_linegauge_set_label_spans((this as any).handle, __0.ptr, __0.len); } finally {
    __0.free();
    }
    return this;
  });
  def(d.LineGauge, 'renderHeadless', function (width: number, height: number, w: any): string {
    const outPtr = ref.alloc(charPtr) as unknown as Buffer; // char**
    const ok = lib.ratatui_headless_render_linegauge(width, height, (w as any).handle, outPtr);
    if (!ok) throw new Error('ratatui_headless_render_linegauge failed');
    const cstrPtr = outPtr.deref();
    const str = ref.readCString(cstrPtr, 0);
    lib.ratatui_string_free(cstrPtr);
    return str;
  });
  def(d.List.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_list_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Paragraph.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_paragraph_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Scrollbar.prototype, 'blockAdv', function (this: any, bordersBits: number, borderType: number, padL: number, padT: number, padR: number, padB: number, titleSpans: SpanInput[]): any {
    const __6 = buildSpans(titleSpans);
    try { lib.ratatui_scrollbar_set_block_adv((this as any).handle, bordersBits, borderType, padL, padT, padR, padB, __6.ptr, __6.len); } finally {
    __6.free();
    }
    return this;
  });
  def(d.Scrollbar.prototype, 'blockTitleAlignment', function (this: any, align: number): any {
    lib.ratatui_scrollbar_set_block_title_alignment((this as any).handle, align);
    return this;
  });
  def(d.Scrollbar.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_scrollbar_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Scrollbar.prototype, 'orientationSide', function (this: any, side: number): any {
    lib.ratatui_scrollbar_set_orientation_side((this as any).handle, side);
    return this;
  });
  def(d.Sparkline.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_sparkline_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Table.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_table_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Tabs.prototype, 'blockTitleSpans', function (this: any, titleSpans: SpanInput[], showBorder: boolean): any {
    const __0 = buildSpans(titleSpans);
    try { lib.ratatui_tabs_set_block_title_spans((this as any).handle, __0.ptr, __0.len, showBorder); } finally {
    __0.free();
    }
    return this;
  });
  def(d.Tabs.prototype, 'dividerSpans', function (this: any, spans: SpanInput[]): any {
    const __0 = buildSpans(spans);
    try { lib.ratatui_tabs_set_divider_spans((this as any).handle, __0.ptr, __0.len); } finally {
    __0.free();
    }
    return this;
  });
}
