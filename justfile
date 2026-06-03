# ratatui-ts — codegen verbs.
# The interop layer (src/native.ts) is 100% generated from the FFI's typed IR
# (../ratatui-ffi/bindings.json). See ../ratatui-ffi/CODEGEN.md for the pipeline contract.

manifest := "../ratatui-ffi/bindings.json"

# Regenerate the generated layers from the manifest, one verb:
#   Stage 1  → src/native.ts            (100% interop, gen-native.js)
#   Stage 2  → src/wrappers.generated.ts (ergonomic wrappers, gen-wrappers.js)
# gen-wrappers.js ALSO writes the Stage-2 residue triage to scripts/residue.txt
# (wrapped-now / deliberately-raw / still-unwrapped). Banners in both files
# point back here.
gen:
    node scripts/gen-native.js --manifest {{manifest}} --out src/native.ts
    node scripts/gen-wrappers.js --manifest {{manifest}} --out src/wrappers.generated.ts

# Prove the generated interop is a superset of the prior hand-written interop.
parity:
    node scripts/parity-report.js --new src/native.ts --out scripts/parity-report.txt

# The manual-work worklist. Stage 2's gen-wrappers.js owns the rich triage
# (it knows what it wrapped); this recipe just regenerates it.
residue:
    node scripts/gen-wrappers.js --manifest {{manifest}} --out src/wrappers.generated.ts

# Type-check + build the binding (tsup -> dist/{cjs,esm} + dts).
build:
    npm run build

# Full local loop: regenerate both layers, report drift, then build.
all: gen parity build
