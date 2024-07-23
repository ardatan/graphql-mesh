import path from 'node:path';
import { defineConfig } from 'rollup';
import includePaths from 'rollup-plugin-includepaths';
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
 *
 * Include a plugin by adding to the {@link deps}:
 * ```json
 * {
 *   "node_modules/<package name>/index": "<relative path to main source file>"
 * }
 * ```
 *
 * For example, include the `@graphql-mesh/plugin-http-cache` plugin by adding:
 * ```json
 * {
 *   "node_modules/@graphql-mesh/plugin-http-cache/index": "../plugins/http-cache/src/index.ts"
 * }
 * ```
 */
const deps = {
  'node_modules/@graphql-mesh/serve-cli/index': 'src/index.ts',
  'node_modules/@graphql-mesh/compose-cli/index': '../compose-cli/src/types.ts', // we bundle compose types ONLY. adding support for configs with both serve and compose
  'node_modules/@graphql-mesh/serve-runtime/index': '../serve-runtime/src/index.ts',
  'node_modules/graphql/index': '../../node_modules/graphql/index.mjs',
  // we want often used transports in the container
  'node_modules/@graphql-mesh/transport-common/index': '../transports/common/src/index.ts',
  'node_modules/@graphql-mesh/transport-http/index': '../transports/http/src/index.ts',
  'node_modules/@graphql-mesh/transport-rest/index': '../transports/rest/src/index.ts',
  'node_modules/@graphql-mesh/transport-soap/index': '../transports/soap/src/index.ts',
  // extras for docker only
  'node_modules/@graphql-mesh/plugin-prometheus/index': '../plugins/prometheus/src/index.ts',
  'node_modules/@graphql-mesh/plugin-http-cache/index': '../plugins/http-cache/src/index.ts',
};

export default defineConfig({
  input: 'src/bin.ts', // Single entry point
  output: {
    file: 'bundle/bin.cjs', // Single output file
    format: 'cjs',
    inlineDynamicImports: true,
  },
  external: ['node-libcurl', '@parcel/watcher'],
  plugins: [
    tsConfigPaths(), // use tsconfig paths to resolve modules
    nodeResolve({ preferBuiltins: true }), // resolve node_modules and bundle them too
    commonjs({
      dynamicRequireTargets: ['@parcel/watcher'],
      ignoreDynamicRequires: true, // Ignore dynamic requires
    }), // convert commonjs to esm
    json(), // support importing json files to esm (needed for commonjs() plugin)
    sucrase({ transforms: ['typescript'] }), // transpile typescript
    packagejson(), // add package jsons
  ],
  preserveModules: false, // ensure all modules are bundled into a single file
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
            'node-libcurl': '^4.0.0',
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
