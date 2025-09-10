import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: { entry: { index: 'src/index.ts' } },
  format: ['cjs', 'esm'],
  outDir: 'dist',
  target: 'es2021',
  // Keep native deps external
  external: ['ffi-napi', 'ref-napi', 'ref-struct-di', 'ref-union-di', 'ref-array-di'],
  // Emit into subfolders for format
  outExtension({ format }) {
    return { js: format === 'esm' ? '.js' : '.js' };
  },
  esbuildOptions(options) {
    // Place outputs in dist/esm and dist/cjs
    if (options.format === 'esm') options.outdir = 'dist/esm';
    if (options.format === 'cjs') options.outdir = 'dist/cjs';
  },
});

