# Bindings Test Manifesto

A pragmatic, portable plan to guarantee correctness, parity, and crash‑safety across all `ratatui_ffi` language bindings. Copy this into every bindings repo. Agents and humans alike should follow it.

## Vision

- One set of tests, many languages: the same rendering scenarios validate Rust (oracle) and every binding.
- 100% functional parity and zero‑crash interop, verified automatically.
- Fast, local developer workflow; CI optional.

## Core Ideas

- Single source of truth: the Rust oracle renders ground‑truth outputs using first‑class `ratatui` APIs. Bindings must match those outputs when driving through `ratatui_ffi`.
- Introspection as a safety net: coverage checker ensures every FFI export has a binding entry.
- Scenario JSON: portable test cases, independent of any language runtime.
- Normalized outputs: text, extended styles, and structured cells are compared deterministically.

## Components

1) Scenario Schema (JSON)
   - Describes a frame (width, height) and a sequence of draw commands.
   - Commands reference widget kinds and their parameters in a plain, FFI‑friendly shape (strings, numbers, arrays).
   - Optional expected outputs (text/styles/cells) for goldens, versioned.

2) Oracle Renderer (Rust)
   - A small binary in `ratatui-ffi/tools` that:
     - Reads a Scenario JSON
     - Constructs ratatui widgets directly (no FFI)
     - Produces outputs: text, styles_ex, cells
     - Writes `ResultJSON` with normalized outputs

3) Binding Runner (per language)
   - Reads the same Scenario JSON
   - Builds the same widgets via the binding APIs (through FFI)
   - Emits the same `ResultJSON`
   - Diffs against the oracle result and fails on mismatch

4) Coverage + Crash Safety
   - Coverage: measure how many FFI exports are exercised by the scenario set
   - Crash safety: run scenarios under panic/exception monitors; add fuzz input later

## Scenario JSON (sketch)

```json
{
  "version": 1,
  "width": 60,
  "height": 20,
  "cmds": [
    { "kind": "Paragraph", "rect": {"x":0,"y":0,"width":60,"height":3},
      "title": {"text":"Hello","showBorder": true},
      "lines": [
        {"spans": [{"text":"hi","style": {"fg":"rgb(255,255,0)","mods":["BOLD"]}}]},
        {"spans": [{"text":"bye","style": {"fg":"idx(5)"}}]}
      ],
      "align": "Left",
      "wrapTrim": true
    },
    { "kind": "Gauge", "rect": {"x":0,"y":3,"width":60,"height":1},
      "ratio": 0.42, "label": "42%" }
  ]
}
```

Notes
- Keep only primitives (numbers, strings, arrays). Encode colors as `rgb(r,g,b)` or `idx(n)` strings, styles as `{fg,bg,mods[]}`.
- Keep widget params flat. Multi‑span lines become arrays of `{text,style}`.
- The schema is intentionally simple; binding runners translate JSON → native structs.

## Result JSON (oracle and bindings)

```json
{
  "version": 1,
  "text": "...\n...",
  "styles_ex": "<compact rows/cols + attrs>",
  "cells": [ {"ch": 32, "fg": 0, "bg": 0, "mods": 0 } ]
}
```

- `text`: headless frame text
- `styles_ex`: extended style dump (string)
- `cells`: structured per‑cell dump using `{ch,fg,bg,mods}`

## Normalization Rules

- Normalize newlines to `\n`
- Ensure fixed frame size (width×height)
- Canonicalize colors to the FFI bit format (bindings can call color helpers)
- Sort object keys in JSON for stability

## Workflow

1) Define/collect scenarios
   - Phase 1: curate a representative set manually (widgets, layout, styles)
   - Phase 2: auto‑emit scenarios from ratatui’s own tests via a feature flag or macro (recommended)

2) Generate oracle outputs
   - `cargo run --bin scenario_runner -- --in scenario.json --out oracle.json`

3) Run binding runner
   - `node bindings-*/test/run_scenario.js --in scenario.json --out binding.json`

4) Diff
   - Compare `oracle.json` vs `binding.json` (text, styles_ex, cells)
   - Fail on any difference (optionally allow waivers for platform quirks)

5) Coverage signal
   - Track which FFI exports were exercised during runs; raise a warning when a family is untested

## Upgrade Strategy

When ratatui/FFI updates:
- Rebuild FFI; regenerate `ffi_introspect --json`; keep 100% binding coverage
- Re‑run scenarios; review diffs
- If intended visual changes: update oracle goldens and re‑generate bindings results
- Add/expand scenarios for new widgets/features

## Suggested Repo Layout

```
ratatui-ffi/
  tools/
    scenario_runner.rs     # oracle renderer (Rust)
  scripts/
    ffi_introspect.sh
bindings-*/
  src/
  test/
    scenarios/
      schema.md           # schema doc
      *.json              # test inputs
    run_scenario.*        # runner via bindings
    diff.*                # oracle vs binding diff
  scripts/
    check-introspection.js
    features-map.json
```

## Agent Playbook (do this first)

1) Ensure 100% export coverage using the introspection checker.
2) Add a minimal scenario set; implement the Rust oracle runner.
3) Implement the binding runner for the current language.
4) Produce and diff outputs; enforce failure on mismatch.
5) Expand scenarios to cover optional features (feature bits), batching, and edge cases.

## Definition of Done (per binding)

- All FFI exports bound and validated by checker
- Scenario runner implemented; passes against oracle for the scenario suite
- No crashes or leaks on scenario execution
- A README/DEV‑GUIDE describing how to run, extend, and regenerate oracles

## Future Extensions

- Auto‑extract scenarios from ratatui tests with a proc‑macro
- Randomized fuzz scenarios (size, colors, spans) with clamps/guards
- Performance baselines (time per scenario, allocs)
- Visual HTML captures for artifacts (optional)

## Why This Works

- Shared JSON inputs remove language noise
- Rust oracle provides authoritative behavior
- Bindings are thin; the diff surface is tight and objective
- The system scales to new widgets and languages without redesign

Make it strict, make it portable, and keep it local and fast.

