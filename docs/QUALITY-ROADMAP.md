# Quality Roadmap and Augmentations (Singularity Core)

This document outlines pragmatic, high‑value augmentations that would push the bindings suite toward a “singularity core” quality bar — think durable, predictable, Microsoft‑level polish. These are not blockers for current usage; they are targeted improvements to sustain robustness and developer joy over time.

## Vision

- One source of truth, many languages: a shared oracle drives parity and confidence across bindings.
- Stable, documented C ABI; thin, idiomatic bindings in each language; zero hidden overhead.
- Continuous, automated validation of correctness, coverage, performance, and compatibility.

## Pillars

- Correctness and Coverage
- Stability and Compatibility
- Performance and Footprint
- Safety and Security
- Developer Experience and Diagnostics
- Packaging and Supply Chain

## Augmentations

1) Cross‑Language Scenario Oracle (high impact)
- Implement the Rust “oracle” runner that accepts Scenario JSON and emits text/styles_ex/cells.
- Add per‑language runners that consume the same scenarios via bindings, then diff against oracle outputs.
- Track coverage: widget families, batching, headless, layout, events.
- Benefits: objective correctness, crash‑safety, and parity across TS/C#/Python.

2) Automated Coverage + Codegen Hooks
- Extend ffi_introspect to optionally emit signature hints (arity + simple type identities), enabling:
  - Binding coverage gate (done for TS), plus basic signature sanity checks.
  - Optional codegen stubs for other languages to reduce hand‑mapping error rate.
- Benefits: speed, fewer regressions when FFI expands.

3) ABI and Compatibility Contracts
- Add an ABI stability test: ensure symbol presence and calling conventions remain stable across minor releases.
- Maintain a compatibility matrix (FFI version ↔ bindings versions) and a small “ABI probe” test.
- Benefits: predictable upgrades for downstream.

4) Diagnostics and Error Model
- Structured error surface for bindings (opt‑in):
  - Clear error messages for null handles, misaligned pointers, capacity issues.
  - Toggle verbose logging via env (already supported on Rust side); document best practices.
- Add a compact “panic report” collector for test environments to capture Rust panics consistently.
- Benefits: faster incident resolution without adding overhead for production code.

5) Performance Validation
- Microbenchmarks for: big batched frames, large lists/tables, headless renders.
- Memory and GC health checks (Node): verify keep‑alive pools and array marshalling don’t regress.
- Optional buffer pooling for large transient arrays (FFI arrays and UTF‑8 strings) when hot‑looping.
- Benefits: sustained zero‑surprise overhead; confidence for large apps.

6) Text Fidelity and Internationalization
- Validate wide glyphs, combining marks, emoji, and grapheme cluster boundaries in headless outputs.
- Document bidi/RTL expectations (scope: terminal rendering constraints).
- Add scenarios that intentionally stress cell symbol width and style transitions.
- Benefits: correctness for global text.

7) Feature Bits and Runtime Gating
- While TS exposes `getFeatureBits()`, consider gentle runtime gating in constructors for optional families (e.g., Scrollbar) with friendly messaging and a bypass flag for advanced users.
- Benefits: prevents surprises in environments built without optional features.

8) Security and Reliability
- Add fuzzing for FFI inputs (Rust side): scenarios with random lines/spans within sane bounds.
- CI jobs with ASAN/UBSAN builds for Rust to catch boundary errors early.
- Supply chain: checksum + signature validation for prebuilt artifacts (Sigstore provenance is already enabled by `--provenance`).
- Benefits: defense‑in‑depth.

9) Packaging Durability
- Prebuilt matrix doc: guaranteed targets, deprecation policy, and fallbacks.
- Optional “no‑postinstall” mode for restricted environments; documented manual placement under `native/` or `prebuilt/`.
- Windows nuances: clarify console/ANSI requirements and PowerShell install notes.
- Benefits: smoother installs across org constraints.

10) Documentation and DX
- Typedoc site for bindings; examples gallery (live code snippets) aligned with scenario JSON.
- “How to debug” section: env toggles, panic logs, event injection for tests.
- Upgrade Guide template for bindings mirroring FFI upgrade notes.
- Benefits: faster onboarding, fewer support cycles.

11) Governance and Quality Gates
- Contributing guide with a short PR checklist:
  - Coverage checker passes.
  - Oracle diff (when scenarios exist) is clean.
  - Benchmarks unchanged or improved for targeted cases.
- Codeowners for FFI + bindings to ensure appropriate reviews.
- Benefits: quality remains consistent as the project grows.

## What’s “Done” vs “Future”

- Done (TS): 100% coverage, idiomatic API, builders, layout, headless, examples, publish pipeline.
- Future: oracle + scenarios (cross‑bindings), ABI stability tests, fuzzing, benchmarks, typedoc site, and optional runtime gating.

## North Star (Microsoft‑quality bar)

- A user can update ratatui_ffi, run the coverage checker, run scenario tests, and ship — with high confidence across TS/C#/Python.
- CI builds all supported targets, publishes signed prebuilts with reproducible provenance.
- Clear, minimal, and precise docs answer 95% of user questions without external digging.
- Measurable SLOs for “build/publish green,” “scenario parity,” and “performance unchanged.”

---

These augmentations are intentionally incremental. Each one is standalone, yields clear value, and does not add runtime cost for users who simply want a thin, predictable binding.

