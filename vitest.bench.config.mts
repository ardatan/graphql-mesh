import { defineConfig } from 'vitest/config';

// Vite otherwise bypasses node_modules to native Node; Mesh packages that match
// tsconfig paths / duplicate graphql copies need to be inlined (same as Hive Gateway).
const inline = [/@graphql-mesh\/.*/, /@graphql-tools\/.*/, /@omnigraph\/.*/, /@apollo\/.*/];

export default defineConfig({
  resolve: {
    alias: [
      // graphql 17 resolves through its exports map; pin CJS entry so Vite and
      // Node share one instance (see Hive Gateway vitest.config.ts).
      { find: /^graphql$/, replacement: 'graphql/index.js' },
    ],
  },
  ssr: {
    resolve: {
      // node resolves graphql 17 through `module-sync` to its esm build; vite must
      // pick the same build or there will be two graphql instances.
      conditions: ['module-sync', 'node', 'development|production'],
    },
  },
  test: {
    // Package-level Hive Gateway federation/stitch benches live under bench/
    // and exercise Mesh-owned packages (@graphql-tools/federation, delegate, …).
    name: 'bench',
    globals: true, // leftoverStack (e2e tenv) registers afterAll
    server: { deps: { inline } },
    hookTimeout: 120_000,
    testTimeout: 120_000,
    benchmark: {
      include: ['bench/**/*.bench.ts'],
      reporters: ['verbose'],
      outputJson: 'bench/results.json',
    },
  },
});
