import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/fingerprint/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  outDir: 'dist',
  target: 'es2020',
  // `"type": "module"` means a `.js` CJS bundle would be parsed as ESM by Node.
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
});
