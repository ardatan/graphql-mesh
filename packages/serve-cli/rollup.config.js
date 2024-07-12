import path from 'node:path';
import { defineConfig } from 'rollup';
import tsConfigPaths from 'rollup-plugin-tsconfig-paths';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';

/**
 * Dependencies that need to be bundled and placed in the node_modules. Modules that
 * are imported by the `mesh.config.ts` file need to exist in the `node_modules`.
 *
 * Needs to be used with the {@link packagejson} rollup plugin.
 *
 * Is a map of destination path to the source file to bundle.
 */
const deps = {
  'node_modules/@graphql-mesh/serve-cli/index': 'src/index.ts',
  'node_modules/@graphql-mesh/serve-runtime/index': '../serve-runtime/src/index.ts',
  'node_modules/@graphql-mesh/transport-http/index': '../transports/http/src/index.ts',
  // extras for docker only
  'node_modules/@graphql-mesh/plugin-prometheus/index': '../plugins/prometheus/src/index.ts',
  'node_modules/@envelop/opentelemetry/index':
    '../../node_modules/@envelop/opentelemetry/esm/index.js', // TODO: maybe have a Mesh plugin for OTEL to bundle
};

export default defineConfig({
  input: {
    bin: 'src/bin.ts',
    ...deps,
  },
  output: {
    dir: 'bundle',
    format: 'esm',
  },
  external: ['uWebSockets.js', 'node-libcurl'],
  plugins: [
    tsConfigPaths(), // use tsconfig paths to resolve modules
    nodeResolve({ preferBuiltins: true }), // resolve node_modules and bundle them too
    commonjs(), // convert commonjs to esm
    json(), // support importing json files to esm (needed for commonjs() plugin)
    sucrase({ transforms: ['typescript'] }), // transpile typescript
    packagejson(), // add package jsons
  ],
});

/**
 * Adds package.json files to the bundle and its dependencies.
 *
 * @type {import('rollup').PluginImpl}
 */
function packagejson() {
  return {
    name: 'packagejson',
    generateBundle(_outputs, bundles) {
      for (const bundle of Object.values(bundles)) {
        const dir = path.dirname(bundle.fileName);
        const bundledFile = path.basename(bundle.fileName);
        const pkg = { type: 'module', main: bundledFile };
        if (bundle.name === 'bin') {
          pkg.dependencies = {
            'uWebSockets.js': 'uNetworking/uWebSockets.js#semver:^20',
            // TODO: node-libcurl has issues with being built in the docker
          };
        }
        this.emitFile({
          type: 'asset',
          fileName: path.join(dir, 'package.json'),
          source: JSON.stringify(pkg),
        });
      }
    },
  };
}
