import { defineConfig } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
  input: 'src/bin.ts',
  output: {
    dir: 'bundle',
    format: 'esm',
  },
  external: ['uWebSockets.js', 'node-libcurl'],
  plugins: [typescript(), commonjs(), json(), nodeResolve()],
});
